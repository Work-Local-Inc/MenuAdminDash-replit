import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { AuthError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request);
    const supabase = createAdminClient() as any;

    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurant_id");

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurant_id is required" },
        { status: 400 },
      );
    }

    console.log("[MENU BUILDER] Fetching menu for restaurant:", restaurantId);

    const { data: categories, error: categoriesError } = await supabase
      .schema("menuca_v3")
      .from("courses")
      .select(
        `
        id,
        name_en,
        name_fr,
        description_en,
        description_fr,
        display_order,
        is_active
      `,
      )
      .eq("restaurant_id", parseInt(restaurantId))
      .is("deleted_at", null)
      .order("display_order", { ascending: true });

    console.log("[MENU BUILDER] Categories query result:", {
      count: categories?.length || 0,
      error: categoriesError,
      sample: categories?.[0],
    });

    if (categoriesError) throw categoriesError;

    // Fetch templates with left join (returns templates even if they have no modifiers)
    // Guard against empty category list to prevent Supabase .in() error
    const categoryIds = (categories as any)?.map((c: any) => c.id) || [];
    let templates: any[] = [];
    let templatesError = null;

    if (categoryIds.length > 0) {
      const result = await (supabase
        .schema("menuca_v3")
        .from("course_modifier_templates" as any)
        .select(
          `
          id,
          course_id,
          library_template_id,
          name,
          is_required,
          min_selections,
          max_selections,
          display_order,
          course_template_modifiers!template_id (
            id,
            name,
            price,
            is_included,
            display_order,
            deleted_at
          )
        `,
        )
        .in("course_id", categoryIds)
        .is("deleted_at", null)
        .order("display_order", { ascending: true }) as any);

      templates = result.data || [];
      templatesError = result.error;
    }

    if (templatesError) throw templatesError;

    // Fetch library template modifiers for templates that reference library groups
    const libraryTemplateIds = templates
      .filter((t: any) => t.library_template_id)
      .map((t: any) => t.library_template_id);

    let libraryModifiers: any[] = [];
    if (libraryTemplateIds.length > 0) {
      const { data: libModsData, error: libModsError } = await (supabase
        .schema("menuca_v3")
        .from("course_template_modifiers" as any)
        .select(
          `
          id,
          template_id,
          name,
          price,
          is_included,
          display_order,
          deleted_at
        `,
        )
        .in("template_id", libraryTemplateIds)
        .is("deleted_at", null)
        .order("display_order", { ascending: true }) as any);

      if (libModsError) {
        console.log(
          "[MENU BUILDER] Library modifiers query error:",
          libModsError,
        );
      } else {
        libraryModifiers = libModsData || [];
        console.log(
          "[MENU BUILDER] Library modifiers loaded:",
          libraryModifiers.length,
        );
      }
    }

    // Query dishes WITHOUT nested prices (FK relationship not in Supabase schema cache)
    // Note: dishes table uses bilingual columns (name_en, name_fr), no image_url column
    const { data: dishes, error: dishesError } = await supabase
      .schema("menuca_v3")
      .from("dishes")
      .select(
        `
        id,
        course_id,
        name_en,
        name_fr,
        description_en,
        description_fr,
        is_active,
        display_order
      `,
      )
      .eq("restaurant_id", parseInt(restaurantId))
      .is("deleted_at", null)
      .order("display_order", { ascending: true });

    console.log("[MENU BUILDER] Dishes query result:", {
      count: dishes?.length || 0,
      error: dishesError,
      sample: dishes?.[0],
    });

    if (dishesError) throw dishesError;

    // Query dish_prices separately and join in application code
    const dishIds = (dishes as any)?.map((d: any) => d.id) || [];
    let dishPrices: any[] = [];

    if (dishIds.length > 0) {
      const { data: pricesData, error: pricesError } = await supabase
        .schema("menuca_v3")
        .from("dish_prices")
        .select(
          `
          id,
          dish_id,
          price,
          size_variant,
          display_order
        `,
        )
        .in("dish_id", dishIds)
        .order("display_order", { ascending: true });

      if (pricesError) {
        console.log("[MENU BUILDER] Prices query error:", pricesError);
      } else {
        dishPrices = pricesData || [];
        console.log("[MENU BUILDER] Prices loaded:", dishPrices.length);
      }
    }

    let dishModifierGroupLinks: any[] = [];
    let restaurantModifierGroups: any[] = [];
    let restaurantModifiers: any[] = [];
    let restaurantModifierPrices: any[] = [];

    if (dishIds.length > 0) {
      const { data: dmgData, error: dmgError } = await supabase
        .schema("menuca_v3")
        .from("dish_modifier_groups")
        .select("id, dish_id, modifier_group_id")
        .in("dish_id", dishIds)
        .is("deleted_at", null);

      if (dmgError) {
        console.log(
          "[MENU BUILDER] dish_modifier_groups query error:",
          dmgError,
        );
      } else {
        dishModifierGroupLinks = dmgData || [];
        console.log(
          "[MENU BUILDER] Dish modifier group links loaded:",
          dishModifierGroupLinks.length,
        );
      }

      const linkedGroupIds = Array.from(
        new Set(dishModifierGroupLinks.map((l: any) => l.modifier_group_id)),
      );
      if (linkedGroupIds.length > 0) {
        const { data: mgData } = await supabase
          .schema("menuca_v3")
          .from("modifier_groups")
          .select("id, restaurant_id, name_en, name_fr, category")
          .in("id", linkedGroupIds)
          .is("deleted_at", null);
        restaurantModifierGroups = mgData || [];

        const { data: modsData } = await supabase
          .schema("menuca_v3")
          .from("modifiers")
          .select(
            "id, modifier_group_id, name_en, name_fr, display_order, is_active",
          )
          .in("modifier_group_id", linkedGroupIds)
          .is("deleted_at", null)
          .order("display_order", { ascending: true });
        restaurantModifiers = modsData || [];

        const modifierIds = restaurantModifiers.map((m: any) => m.id);
        if (modifierIds.length > 0) {
          const { data: prData } = await supabase
            .schema("menuca_v3")
            .from("modifier_prices")
            .select("id, modifier_id, price, modifier_size_variant_id")
            .in("modifier_id", modifierIds);
          restaurantModifierPrices = prData || [];
        }

        console.log(
          "[MENU BUILDER] Modifier groups loaded:",
          restaurantModifierGroups.length,
          "modifiers:",
          restaurantModifiers.length,
        );
      }
    }

    // Filter soft-deleted modifiers in application layer after fetching with left joins
    // Also add computed 'name' and 'description' fields for backward compatibility (using English as default)
    const categoriesWithData =
      (categories as any)?.map((category: any) => ({
        ...category,
        // Add computed name/description for backward compatibility
        name: category.name_en || category.name_fr || "",
        description: category.description_en || category.description_fr || "",
        modifier_groups:
          (templates as any)
            ?.filter((t: any) => t.course_id === category.id)
            .map((t: any) => {
              // CRITICAL FIX: Use library modifiers when library_template_id is set
              let modifiers: any[] = [];
              if (t.library_template_id) {
                // Try library template via JOIN first
                modifiers = libraryModifiers
                  .filter(
                    (m: any) =>
                      m.template_id === t.library_template_id && !m.deleted_at,
                  )
                  .sort((a: any, b: any) => a.display_order - b.display_order);

                // DEFENSIVE FALLBACK: If library join returns empty, use course_template_modifiers
                if (!modifiers || modifiers.length === 0) {
                  console.warn(
                    `[FALLBACK] Library join empty for template ${t.id} (library_template_id: ${t.library_template_id}), using course_template_modifiers`,
                  );
                  modifiers =
                    t.course_template_modifiers?.filter(
                      (m: any) => !m.deleted_at,
                    ) || [];
                }
              } else {
                // Use own modifiers for custom (non-library) templates
                modifiers =
                  t.course_template_modifiers?.filter(
                    (m: any) => !m.deleted_at,
                  ) || [];
              }

              return {
                ...t,
                course_template_modifiers: modifiers,
              };
            }) || [],
        dishes:
          (dishes as any)
            ?.filter((d: any) => d.course_id === category.id)
            .map((dish: any) => {
              // Join dish_prices from separate query
              const dishPricesForDish = dishPrices.filter(
                (p: any) => p.dish_id === dish.id,
              );
              const sortedPrices = dishPricesForDish.sort(
                (a: any, b: any) => a.display_order - b.display_order,
              );
              const defaultPrice = sortedPrices[0]?.price || 0;

              return {
                ...dish,
                // Add computed name/description for backward compatibility
                name: dish.name_en || dish.name_fr || "",
                description: dish.description_en || dish.description_fr || "",
                dish_prices: dishPricesForDish, // Add prices array from separate query
                price: defaultPrice, // Computed price from first variant
                modifier_groups:
                  dishModifierGroupLinks
                    .filter((link: any) => link.dish_id === dish.id)
                    .map((link: any) => {
                      const group = restaurantModifierGroups.find(
                        (g: any) => g.id === link.modifier_group_id,
                      );
                      if (!group) return null;

                      const groupModifiers = restaurantModifiers
                        .filter((m: any) => m.modifier_group_id === group.id)
                        .map((m: any) => {
                          const basePrice = restaurantModifierPrices.find(
                            (p: any) =>
                              p.modifier_id === m.id &&
                              (!p.modifier_size_variant_id ||
                                p.modifier_size_variant_id === 1),
                          );
                          return {
                            id: m.id,
                            modifier_group_id: group.id,
                            name: m.name_en || m.name_fr || "",
                            price: basePrice?.price || 0,
                            is_included: false,
                            is_default: false,
                            display_order: m.display_order,
                          };
                        });

                      return {
                        id: group.id,
                        dish_id: dish.id,
                        course_template_id: null,
                        name: group.name_en || group.name_fr || "",
                        is_required: false,
                        min_selections: 0,
                        max_selections: groupModifiers.length || 1,
                        display_order: 0,
                        is_custom: true,
                        dish_modifiers: groupModifiers,
                      };
                    })
                    .filter(Boolean) || [],
              };
            }) || [],
      })) || [];

    return NextResponse.json(categoriesWithData);
  } catch (error: any) {
    console.error("[MENU BUILDER ERROR]", error);
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to fetch menu builder data" },
      { status: 500 },
    );
  }
}

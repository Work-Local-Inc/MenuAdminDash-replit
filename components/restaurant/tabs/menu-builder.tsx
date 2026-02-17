"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Search,
  X,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { useRestaurants } from "@/lib/hooks/use-restaurants";
import {
  useMenuBuilder,
  useRestaurantModifierGroups,
  MenuBuilderCategory,
  MenuBuilderDish,
  CategoryModifierGroup,
  useBreakInheritance,
  useReorderMenuItems,
  useCreateCategoryModifierGroup,
  useUpdateCategoryModifierGroup,
  useDeleteCategoryModifierGroup,
} from "@/lib/hooks/use-menu-builder";
import {
  useCreateCourse,
  useUpdateCourse,
  useDeleteCourse,
  useCreateDish,
  useUpdateDish,
  useDeleteDish,
  useReorderCourses,
} from "@/lib/hooks/use-menu";
import { ModifierGroupEditor } from "@/components/admin/menu-builder/ModifierGroupEditor";
import { ModifierGroupSection } from "@/components/admin/menu-builder/ModifierGroupSection";
import { InlinePriceEditor } from "@/components/admin/menu-builder/InlinePriceEditor";
import { DishModifierPanel } from "@/components/admin/menu-builder/DishModifierPanel";
import { SizeVariantManager } from "@/components/admin/menu-builder/SizeVariantManager";
import { DishAvailabilityEditor } from "@/components/admin/menu-builder/DishAvailabilityEditor";
import RestaurantMenu from "@/components/customer/restaurant-menu";
import { useToast } from "@/hooks/use-toast";

interface RestaurantMenuBuilderProps {
  restaurantId: string;
}

export function RestaurantMenuBuilder({
  restaurantId,
}: RestaurantMenuBuilderProps) {
  const { toast } = useToast();
  const { data: restaurants = [] } = useRestaurants();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDishIds, setSelectedDishIds] = useState<Set<number>>(
    new Set(),
  );

  // Dialogs
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<MenuBuilderCategory | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(
    null,
  );

  const [dishDialogOpen, setDishDialogOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<MenuBuilderDish | null>(null);
  const [dishCategoryId, setDishCategoryId] = useState<number | null>(null);
  const [deletingDishId, setDeletingDishId] = useState<number | null>(null);
  const [dishImageFile, setDishImageFile] = useState<File | null>(null);
  const [imageWasRemoved, setImageWasRemoved] = useState(false);

  const [priceEditorOpen, setPriceEditorOpen] = useState(false);
  const [editingPriceDish, setEditingPriceDish] =
    useState<MenuBuilderDish | null>(null);

  const [modifierDialogOpen, setModifierDialogOpen] = useState(false);
  const [modifierCourseId, setModifierCourseId] = useState<number | null>(null);
  const [editingModifierGroup, setEditingModifierGroup] =
    useState<CategoryModifierGroup | null>(null);

  const [dishModifiersDialogOpen, setDishModifiersDialogOpen] = useState(false);
  const [editingDishModifiers, setEditingDishModifiers] =
    useState<MenuBuilderDish | null>(null);

  const [expandedCategoryModifiers, setExpandedCategoryModifiers] = useState<
    Set<number>
  >(new Set());

  const { data: categories = [], isLoading: loadingCategories } =
    useMenuBuilder(parseInt(restaurantId) > 0 ? parseInt(restaurantId) : null);

  const { data: modifierGroups = [] } =
    useRestaurantModifierGroups(restaurantId);

  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();
  const reorderCourses = useReorderCourses();

  const createDish = useCreateDish();
  const updateDish = useUpdateDish();
  const deleteDish = useDeleteDish();

  const breakInheritance = useBreakInheritance();

  const createModifierGroup = useCreateCategoryModifierGroup();
  const updateModifierGroup = useUpdateCategoryModifierGroup();
  const deleteModifierGroup = useDeleteCategoryModifierGroup();

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    is_active: true,
  });

  const [dishForm, setDishForm] = useState({
    name: "",
    description: "",
    price: "",
    is_active: true,
  });

  const selectedRestaurant = restaurants.find(
    (r: any) => r.id.toString() === restaurantId,
  );

  const allModifierGroups: any[] = [];
  const seen = new Set<number>();

  categories.forEach((category) => {
    category.modifier_groups?.forEach((modifierGroup: any) => {
      if (seen.has(modifierGroup.id)) return;
      if (
        modifierGroup.course_id !== null &&
        (modifierGroup.library_template_id === null ||
          modifierGroup.library_template_id === modifierGroup.id)
      ) {
        allModifierGroups.push(modifierGroup);
        seen.add(modifierGroup.id);
      }
    });
  });

  const availableModifierGroups = [...modifierGroups, ...allModifierGroups].map(
    (group) => ({
      ...group,
      modifiers: group.modifiers || group.course_template_modifiers || [],
    }),
  );

  const categoryModifierMap = new Map<number, number[]>();

  categories.forEach((category) => {
    const associatedGroupIds = (category.modifier_groups || [])
      .map((modifierGroup: any) => {
        if (modifierGroup.library_template_id !== null) {
          return modifierGroup.library_template_id;
        }
        return modifierGroup.id;
      })
      .filter((id: number | null) => id !== null);

    if (associatedGroupIds.length > 0) {
      categoryModifierMap.set(category.id, associatedGroupIds);
    }
  });

  const filteredCategories = categories
    .map((category) => {
      let dishes = category.dishes;

      if (searchQuery) {
        dishes = dishes.filter((dish) =>
          dish.name.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      }

      if (statusFilter === "active") {
        dishes = dishes.filter((dish) => dish.is_active);
      } else if (statusFilter === "inactive") {
        dishes = dishes.filter((dish) => !dish.is_active);
      }

      return { ...category, dishes };
    })
    .filter((category) => {
      if (
        categoryFilter !== "all" &&
        category.id.toString() !== categoryFilter
      ) {
        return false;
      }
      return (
        category.dishes.length > 0 || (!searchQuery && statusFilter === "all")
      );
    });

  const toggleSelectDish = (dishId: number) => {
    const newSelection = new Set(selectedDishIds);
    if (newSelection.has(dishId)) {
      newSelection.delete(dishId);
    } else {
      newSelection.add(dishId);
    }
    setSelectedDishIds(newSelection);
  };

  const toggleSelectAll = () => {
    const allDishIds = filteredCategories.flatMap((c) =>
      c.dishes.map((d) => d.id),
    );
    if (selectedDishIds.size === allDishIds.length) {
      setSelectedDishIds(new Set());
    } else {
      setSelectedDishIds(new Set(allDishIds));
    }
  };

  const clearSelection = () => setSelectedDishIds(new Set());

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: "", description: "", is_active: true });
    setCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: MenuBuilderCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || "",
      is_active: category.is_active,
    });
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (editingCategory) {
      await updateCourse.mutateAsync({
        id: editingCategory.id,
        restaurant_id: parseInt(restaurantId),
        data: categoryForm,
      });
    } else {
      await createCourse.mutateAsync({
        restaurant_id: parseInt(restaurantId),
        ...categoryForm,
      });
    }
    setCategoryDialogOpen(false);
  };

  const handleDeleteCategory = async () => {
    if (deletingCategoryId) {
      await deleteCourse.mutateAsync({
        id: deletingCategoryId,
        restaurant_id: parseInt(restaurantId),
      });
      setDeletingCategoryId(null);
    }
  };

  const handleToggleCategoryActive = async (category: MenuBuilderCategory) => {
    await updateCourse.mutateAsync({
      id: category.id,
      restaurant_id: parseInt(restaurantId),
      data: { is_active: !category.is_active },
    });
  };

  const handleToggleCategoryModifier = async (
    categoryId: number,
    modifierGroupId: number,
    isAssociated: boolean,
  ) => {
    try {
      if (isAssociated) {
        const category = categories.find((c) => c.id === categoryId);
        const categoryModifierGroup = category?.modifier_groups.find(
          (modifierGroup: any) =>
            modifierGroup.library_template_id === modifierGroupId,
        );
        if (categoryModifierGroup) {
          await deleteModifierGroup.mutateAsync(categoryModifierGroup.id);
        }
      } else {
        const response = await fetch("/api/menu/category-modifier-groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            course_id: categoryId,
            modifier_group_id: modifierGroupId,
          }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to associate modifier group",
          );
        }
        const queryClient = (await import("@/lib/queryClient")).queryClient;
        queryClient.invalidateQueries({ queryKey: ["/api/menu/builder"] });
        queryClient.invalidateQueries({
          queryKey: ["/api/menu/modifier-groups"],
        });
      }
    } catch (error: any) {
      console.error("[TOGGLE CATEGORY MODIFIER ERROR]", error);
      alert(error.message || "Failed to update category modifier association");
    }
  };

  const handleAddDish = (categoryId: number) => {
    setDishCategoryId(categoryId);
    setEditingDish(null);
    setDishImageFile(null);
    setImageWasRemoved(false);
    setDishForm({ name: "", description: "", price: "", is_active: true });
    setDishDialogOpen(true);
  };

  const handleEditDish = (dish: MenuBuilderDish) => {
    setDishCategoryId(dish.course_id);
    setEditingDish(dish);
    setDishImageFile(null);
    setImageWasRemoved(false);
    const priceValue = dish.price ?? dish.dish_prices?.[0]?.price ?? 0;
    setDishForm({
      name: dish.name,
      description: dish.description || "",
      price: priceValue.toString(),
      is_active: dish.is_active,
    });
    setDishDialogOpen(true);
  };

  const handleSaveDish = async () => {
    try {
      let imageUrl: string | null = null;

      if (dishImageFile) {
        const formData = new FormData();
        formData.append("file", dishImageFile);
        formData.append("bucket", "dish-images");
        const dishId = editingDish?.id || Date.now();
        formData.append(
          "path",
          `${restaurantId}/${dishId}_${Date.now()}_${dishImageFile.name}`,
        );

        const uploadRes = await fetch("/api/storage/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const errorData = await uploadRes
            .json()
            .catch(() => ({ error: "Failed to upload image" }));
          throw new Error(errorData.error || "Failed to upload image");
        }

        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }

      const dishData: any = {
        name: dishForm.name,
        description: dishForm.description || null,
        price: parseFloat(dishForm.price),
        course_id: dishCategoryId,
        is_active: dishForm.is_active,
      };

      if (imageUrl) {
        dishData.image_url = imageUrl;
      } else if (imageWasRemoved) {
        dishData.image_url = null;
      }

      if (editingDish) {
        await updateDish.mutateAsync({
          id: editingDish.id,
          restaurant_id: parseInt(restaurantId),
          data: dishData,
        });
      } else {
        await createDish.mutateAsync({
          restaurant_id: parseInt(restaurantId),
          ...dishData,
        });
      }

      setDishDialogOpen(false);
      setDishImageFile(null);
      setImageWasRemoved(false);
    } catch (error) {
      console.error("Error saving dish:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save dish. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDish = async () => {
    if (deletingDishId) {
      await deleteDish.mutateAsync({
        id: deletingDishId,
        restaurant_id: parseInt(restaurantId),
      });
      setDeletingDishId(null);
      const newSelection = new Set(selectedDishIds);
      newSelection.delete(deletingDishId);
      setSelectedDishIds(newSelection);
    }
  };

  const handleToggleDishActive = async (dish: MenuBuilderDish) => {
    await updateDish.mutateAsync({
      id: dish.id,
      restaurant_id: parseInt(restaurantId),
      data: { is_active: !dish.is_active },
    });
  };

  const handleEditDishPrice = (dish: MenuBuilderDish) => {
    setEditingPriceDish(dish);
    setPriceEditorOpen(true);
  };

  const handleViewDishModifiers = (dishId: number) => {
    const dish = categories
      .flatMap((c) => c.dishes)
      .find((d) => d.id === dishId);
    if (dish) {
      setEditingDishModifiers(dish);
      setDishModifiersDialogOpen(true);
    }
  };

  const handleBreakDishInheritance = async (dishId: number) => {
    await breakInheritance.mutateAsync(dishId);
  };

  const handleAddModifierGroup = (courseId: number) => {
    setModifierCourseId(courseId);
    setEditingModifierGroup(null);
    setModifierDialogOpen(true);
  };

  const handleEditModifierGroup = (modifierGroup: CategoryModifierGroup) => {
    setModifierCourseId(modifierGroup.course_id);
    setEditingModifierGroup(modifierGroup);
    setModifierDialogOpen(true);
  };

  const toggleCategoryModifiers = (categoryId: number) => {
    const newExpanded = new Set(expandedCategoryModifiers);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategoryModifiers(newExpanded);
  };

  const handleCategoryDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(categories);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);

    await reorderCourses.mutateAsync({
      restaurant_id: parseInt(restaurantId),
      course_ids: items.map((c) => c.id),
    });
  };

  const reorderMenuItems = useReorderMenuItems();

  const handleDishReorder = async (categoryId: number, dishIds: number[]) => {
    await reorderMenuItems.mutateAsync({
      restaurant_id: parseInt(restaurantId),
      dish_ids: dishIds,
    });
  };

  const handleBulkMarkActive = async () => {
    const promises = Array.from(selectedDishIds).map((dishId) =>
      updateDish.mutateAsync({
        id: dishId,
        restaurant_id: parseInt(restaurantId),
        data: { is_active: true },
      }),
    );
    await Promise.all(promises);
    toast({
      title: "Success",
      description: `${selectedDishIds.size} dishes marked as active`,
    });
    clearSelection();
  };

  const handleBulkMarkInactive = async () => {
    const promises = Array.from(selectedDishIds).map((dishId) =>
      updateDish.mutateAsync({
        id: dishId,
        restaurant_id: parseInt(restaurantId),
        data: { is_active: false },
      }),
    );
    await Promise.all(promises);
    toast({
      title: "Success",
      description: `${selectedDishIds.size} dishes marked as inactive`,
    });
    clearSelection();
  };

  const handleBulkDelete = async () => {
    const promises = Array.from(selectedDishIds).map((dishId) =>
      deleteDish.mutateAsync({
        id: dishId,
        restaurant_id: parseInt(restaurantId),
      }),
    );
    await Promise.all(promises);
    toast({
      title: "Success",
      description: `${selectedDishIds.size} dishes deleted`,
    });
    clearSelection();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toolbar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
              {searchQuery && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery("")}
                  data-testid="button-clear-search"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger
                className="w-full md:w-48"
                data-testid="select-category-filter"
              >
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                className="w-full md:w-40"
                data-testid="select-status-filter"
              >
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleCreateCategory}
              data-testid="button-create-category"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Selection Toolbar */}
      {selectedDishIds.size > 0 && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary shadow-lg">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div
                  className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md font-semibold text-sm"
                  data-testid="text-selected-count"
                >
                  {selectedDishIds.size}{" "}
                  {selectedDishIds.size === 1 ? "dish" : "dishes"}
                </div>
                <span className="text-sm text-muted-foreground">selected</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearSelection}
                  data-testid="button-clear-selection"
                  className="ml-2"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleBulkMarkActive}
                    data-testid="button-bulk-mark-active"
                    className="bg-emerald-600 text-white"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Active
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkMarkInactive}
                    data-testid="button-bulk-mark-inactive"
                  >
                    <EyeOff className="w-4 h-4 mr-2" />
                    Inactive
                  </Button>
                </div>

                <div className="h-6 w-px bg-border mx-1" />

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                  data-testid="button-bulk-delete"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Menu Content */}
      {loadingCategories ? (
        <div className="space-y-4">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
        </div>
      ) : filteredCategories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium mb-2">No categories yet</p>
            <p className="text-muted-foreground mb-4">
              Create your first category to start building your menu
            </p>
            <Button
              onClick={handleCreateCategory}
              data-testid="button-create-first-category"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Category
            </Button>
          </CardContent>
        </Card>
      ) : selectedRestaurant ? (
        <RestaurantMenu
          restaurant={selectedRestaurant}
          courses={filteredCategories.map((category) => ({
            id: category.id,
            name: category.name,
            description: category.description,
            is_active: category.is_active,
            display_order: category.display_order,
            dishes: category.dishes.map((dish) => ({
              id: dish.id,
              name: dish.name,
              description: dish.description,
              price: dish.price,
              image_url: dish.image_url,
              is_active: dish.is_active,
              course_id: dish.course_id,
              display_order: dish.display_order,
              modifier_groups: dish.modifier_groups,
            })),
          }))}
          hasMenu={filteredCategories.length > 0}
          editorMode={true}
          availableModifierGroups={availableModifierGroups}
          getCategoryModifierIds={(categoryId) =>
            categoryModifierMap.get(categoryId) || []
          }
          onToggleCategoryModifier={handleToggleCategoryModifier}
          onEditCategory={(categoryId) => {
            const category = categories.find((c) => c.id === categoryId);
            if (category) handleEditCategory(category);
          }}
          onDeleteCategory={(categoryId) => setDeletingCategoryId(categoryId)}
          onToggleCategoryActive={(categoryId) => {
            const category = categories.find((c) => c.id === categoryId);
            if (category) handleToggleCategoryActive(category);
          }}
          onAddDish={handleAddDish}
          onEditDish={(dishId) => {
            const dish = categories
              .flatMap((c) => c.dishes)
              .find((d) => d.id === dishId);
            if (dish) handleEditDish(dish);
          }}
          onDeleteDish={setDeletingDishId}
          onToggleDishActive={(dishId) => {
            const dish = categories
              .flatMap((c) => c.dishes)
              .find((d) => d.id === dishId);
            if (dish) handleToggleDishActive(dish);
          }}
          onViewDishModifiers={handleViewDishModifiers}
          onEditDishPrice={(dishId) => {
            const dish = categories
              .flatMap((c) => c.dishes)
              .find((d) => d.id === dishId);
            if (dish) handleEditDishPrice(dish);
          }}
          onBreakDishInheritance={handleBreakDishInheritance}
          onReorderCategories={(categoryIds) => {
            reorderCourses.mutateAsync({
              restaurant_id: parseInt(restaurantId),
              course_ids: categoryIds,
            });
          }}
          onReorderDishes={(categoryId, dishIds) =>
            handleDishReorder(categoryId, dishIds)
          }
          selectedDishIds={selectedDishIds}
          onToggleSelectDish={toggleSelectDish}
        />
      ) : null}

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent data-testid="dialog-category">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit" : "Create"} Category
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update category details"
                : "Add a new menu category"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                placeholder="e.g., Appetizers, Main Courses..."
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, name: e.target.value })
                }
                data-testid="input-category-name"
              />
            </div>
            <div>
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Brief description of this category..."
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    description: e.target.value,
                  })
                }
                data-testid="textarea-category-description"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={categoryForm.is_active}
                onCheckedChange={(checked) =>
                  setCategoryForm({ ...categoryForm, is_active: checked })
                }
                data-testid="switch-category-active"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCategoryDialogOpen(false)}
              data-testid="button-cancel-category"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCategory}
              disabled={
                !categoryForm.name ||
                createCourse.isPending ||
                updateCourse.isPending
              }
              data-testid="button-save-category"
            >
              {createCourse.isPending || updateCourse.isPending
                ? "Saving..."
                : "Save Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <AlertDialog
        open={!!deletingCategoryId}
        onOpenChange={(open) => !open && setDeletingCategoryId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the category and all dishes in it. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-category">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover-elevate"
              data-testid="button-confirm-delete-category"
            >
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dish Dialog */}
      <Dialog
        open={dishDialogOpen}
        onOpenChange={(open) => {
          setDishDialogOpen(open);
          if (!open) {
            setDishImageFile(null);
            setImageWasRemoved(false);
          }
        }}
      >
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-testid="dialog-dish"
        >
          <DialogHeader>
            <DialogTitle>{editingDish ? "Edit" : "Create"} Dish</DialogTitle>
            <DialogDescription>
              {editingDish
                ? "Update dish details"
                : "Add a new dish to the menu"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                placeholder="Dish name..."
                value={dishForm.name}
                onChange={(e) =>
                  setDishForm({ ...dishForm, name: e.target.value })
                }
                data-testid="input-dish-name"
              />
            </div>
            <div>
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Brief description..."
                value={dishForm.description}
                onChange={(e) =>
                  setDishForm({ ...dishForm, description: e.target.value })
                }
                data-testid="textarea-dish-description"
              />
            </div>
            <div>
              <Label>Image (Optional)</Label>
              <ImageUpload
                value={editingDish?.image_url}
                onChange={setDishImageFile}
                onRemove={() => setImageWasRemoved(true)}
                data-testid="image-upload-dish"
              />
            </div>
            <div>
              <Label>Base Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={dishForm.price}
                onChange={(e) =>
                  setDishForm({ ...dishForm, price: e.target.value })
                }
                data-testid="input-dish-price"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This is the default price. Add size variants below for multiple
                price options.
              </p>
            </div>

            {editingDish && (
              <div className="pt-4 border-t">
                <SizeVariantManager dishId={editingDish.id} />
              </div>
            )}

            {editingDish && (
              <div className="pt-4 border-t">
                <DishAvailabilityEditor dishId={editingDish.id} />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={dishForm.is_active}
                onCheckedChange={(checked) =>
                  setDishForm({ ...dishForm, is_active: checked })
                }
                data-testid="switch-dish-active"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDishDialogOpen(false)}
              data-testid="button-cancel-dish"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveDish}
              disabled={
                !dishForm.name ||
                !dishForm.price ||
                createDish.isPending ||
                updateDish.isPending
              }
              data-testid="button-save-dish"
            >
              {createDish.isPending || updateDish.isPending
                ? "Saving..."
                : "Save Dish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dish Dialog */}
      <AlertDialog
        open={!!deletingDishId}
        onOpenChange={(open) => !open && setDeletingDishId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dish?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this dish. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-dish">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDish}
              className="bg-destructive text-destructive-foreground hover-elevate"
              data-testid="button-confirm-delete-dish"
            >
              Delete Dish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Price Editor Dialog */}
      {editingPriceDish && (
        <InlinePriceEditor
          dish={editingPriceDish}
          restaurantId={parseInt(restaurantId)}
          open={priceEditorOpen}
          onOpenChange={(open) => {
            setPriceEditorOpen(open);
            if (!open) setEditingPriceDish(null);
          }}
        />
      )}

      {/* Modifier Group Editor Dialog */}
      {modifierCourseId && (
        <ModifierGroupEditor
          courseId={modifierCourseId}
          modifierGroup={editingModifierGroup}
          open={modifierDialogOpen}
          onOpenChange={(open) => {
            setModifierDialogOpen(open);
            if (!open) {
              setModifierCourseId(null);
              setEditingModifierGroup(null);
            }
          }}
        />
      )}

      {/* Dish Modifiers Management Dialog */}
      <Dialog
        open={dishModifiersDialogOpen}
        onOpenChange={(open) => {
          setDishModifiersDialogOpen(open);
          if (!open) setEditingDishModifiers(null);
        }}
      >
        <DialogContent
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          data-testid="dialog-dish-modifiers"
        >
          <DialogHeader>
            <DialogTitle>Manage Modifiers</DialogTitle>
            <DialogDescription>
              Configure modifier groups for this dish (category modifier groups
              + custom groups)
            </DialogDescription>
          </DialogHeader>

          {editingDishModifiers && (
            <DishModifierPanel
              dish={editingDishModifiers}
              restaurantId={parseInt(restaurantId)}
              onClose={() => setDishModifiersDialogOpen(false)}
            />
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDishModifiersDialogOpen(false)}
              data-testid="button-close-modifiers"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * RestoZone Delivery Provider Adapter
 *
 * Implements the DeliveryProviderAdapter interface for RestoZone.
 * Handles:
 * 1. getFee() - Get delivery fee based on distance
 * 2. dispatch() - Request driver after order accepted
 * 3. Backup email fallback when API fails
 */

import type {
  DeliveryProviderAdapter,
  DeliveryFeeRequest,
  DeliveryFeeResponse,
  DispatchRequest,
  DispatchResponse,
} from "../types";

const RESTOZONE_API = {
  getFees: "https://restozone.ca/deliveryzone/api/fraislivraison",
  dispatchDriver:
    "https://restozone.ca/api3rdparty/request_delivery/65e974f303d394c72942364d06840e09",
};

const RESTOZONE_BACKUP_EMAILS = [
  "Deliveryzonecanada@gmail.com",
  "mattmenuottawa2@gmail.com",
  "restozonedispatch@gmail.com",
];

const PAYMENT_METHOD_MAP: Record<string, string> = {
  card: "card",
  credit_card: "card",
  debit: "debit",
  cash: "cash",
  interac: "interac",
  card_at_door: "card",
  default: "card",
};

function mapPaymentMethod(method: string): string {
  const normalizedMethod = (method || "").toLowerCase().trim();
  return PAYMENT_METHOD_MAP[normalizedMethod] || PAYMENT_METHOD_MAP["default"];
}

export class RestoZoneAdapter implements DeliveryProviderAdapter {
  code = "restozone";
  name = "RestoZone";

  async getFee(request: DeliveryFeeRequest): Promise<DeliveryFeeResponse> {
    const restozoneId = parseInt(request.providerExternalId, 10);

    if (!restozoneId || isNaN(restozoneId)) {
      return {
        success: false,
        fee: null,
        error: "Invalid RestoZone ID",
      };
    }

    try {
      const response = await fetch(RESTOZONE_API.getFees, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          idresto: restozoneId,
          distance: request.distanceKm,
        }),
      });

      const result = await response.json();

      console.log(
        `[RestoZone getFee] Restaurant ${request.restaurantId} (RestoZone ID: ${restozoneId}), Distance: ${request.distanceKm}km, Response:`,
        result,
      );

      if (result && typeof result.frais !== "undefined") {
        return {
          success: true,
          fee: parseFloat(result.frais),
          source: "provider_api",
        };
      } else {
        return {
          success: false,
          fee: null,
          error: "Invalid response from RestoZone API",
        };
      }
    } catch (error: any) {
      console.error("[RestoZone getFee] API call failed:", error.message);
      return {
        success: false,
        fee: null,
        error: error.message || "Failed to connect to RestoZone",
      };
    }
  }

  async dispatch(request: DispatchRequest): Promise<DispatchResponse> {
    const restozoneId = parseInt(request.providerExternalId, 10);

    if (!restozoneId || isNaN(restozoneId)) {
      return {
        success: false,
        error: "Invalid RestoZone ID",
      };
    }

    const phone = request.customerPhone.replace(/\D/g, "");
    const postalCode = request.postalCode.replace("-", "");
    const mappedPaymentMethod = mapPaymentMethod(request.paymentMethod);

    const payload = {
      idresto: restozoneId,
      adresse: request.address,
      codepostal: postalCode,
      nomclient: request.customerName,
      telclient: phone,
      emailclient: request.customerEmail,
      preptime: request.prepTime,
      frais: request.deliveryFee,
      tip: request.driverTip || 0,
      donnerlivreur: request.driverEarning || 4,
      distance: request.distanceKm,
      note: request.notes,
      type_paiement1: mappedPaymentMethod,
      total: request.total,
    };

    console.log(
      `[RestoZone dispatch] Order ${request.orderId} for restaurant ${request.restaurantId}:`,
      payload,
    );

    try {
      const response = await fetch(RESTOZONE_API.dispatchDriver, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json;charset=UTF-8",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      console.log(
        `[RestoZone dispatch] Order ${request.orderId} response:`,
        result,
      );

      if (result && result.success === true) {
        return {
          success: true,
          usedBackupEmail: false,
        };
      } else {
        console.warn(
          `[RestoZone dispatch] API returned failure for order ${request.orderId}, sending backup email`,
        );
        await this.sendBackupEmail(
          request,
          payload,
          "API returned failure response",
        );
        return {
          success: true,
          usedBackupEmail: true,
        };
      }
    } catch (error: any) {
      console.error(
        `[RestoZone dispatch] API call failed for order ${request.orderId}:`,
        error.message,
      );
      await this.sendBackupEmail(request, payload, error.message);
      return {
        success: true,
        usedBackupEmail: true,
      };
    }
  }

  private async sendBackupEmail(
    request: DispatchRequest,
    payload: Record<string, any>,
    errorReason: string,
  ): Promise<void> {
    const emailContent = `
RestoZone Driver Request - BACKUP EMAIL
========================================
Order ID: ${request.orderId}
Restaurant: ${request.restaurantId}
Error: ${errorReason}

CUSTOMER DETAILS
----------------
Name: ${request.customerName}
Phone: ${request.customerPhone}
Email: ${request.customerEmail}
Address: ${request.address}
Postal Code: ${request.postalCode}

ORDER DETAILS
-------------
Total: $${request.total.toFixed(2)}
Delivery Fee: $${request.deliveryFee.toFixed(2)}
Driver Tip: $${(request.driverTip || 0).toFixed(2)}
Payment Method: ${request.paymentMethod}

DELIVERY INFO
-------------
Distance: ${request.distanceKm} km
Prep Time: ${request.prepTime}
Notes: ${request.notes || "None"}

API PAYLOAD (for debugging)
---------------------------
${JSON.stringify(payload, null, 2)}
`.trim();

    console.log(
      "[RestoZone Backup Email] Sending to:",
      RESTOZONE_BACKUP_EMAILS.join(", "),
    );
    console.log("[RestoZone Backup Email] Content:", emailContent);

    try {
      const resendApiKey = process.env.RESEND_API_KEY;

      if (resendApiKey) {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "MenuAI Orders <orders@menuai.ca>",
            to: RESTOZONE_BACKUP_EMAILS,
            subject: `[BACKUP] Driver Request - Order #${request.orderId}`,
            text: emailContent,
          }),
        });

        if (response.ok) {
          console.log("[RestoZone Backup Email] Sent successfully via Resend");
        } else {
          const error = await response.text();
          console.error("[RestoZone Backup Email] Resend API failed:", error);
        }
      } else {
        console.warn(
          "[RestoZone Backup Email] RESEND_API_KEY not configured, email logged but not sent",
        );
      }
    } catch (error: any) {
      console.error("[RestoZone Backup Email] Failed to send:", error.message);
    }
  }
}

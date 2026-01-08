# Subdomain Setup Guide for Menu.ca Restaurants

This guide explains how to add a new restaurant subdomain to Menu.ca v3.

## Overview

Menu.ca supports two routing methods:
1. **Path-based**: `orders.menu.ca/r/restaurant-name-123`
2. **Subdomain-based**: `restaurantname.menu.ca` (branded URL)

Subdomain routing provides a cleaner, branded experience for customers.

## Prerequisites

- Access to Replit deployment settings
- Access to 1984.is DNS management (or your DNS provider)
- Restaurant already exists in v3 database

## Step-by-Step Setup

### 1. Add Subdomain Mapping to Code

Edit `lib/subdomain-mapping.ts` and add the restaurant to `SUBDOMAIN_MAPPINGS`:

```typescript
export const SUBDOMAIN_MAPPINGS: SubdomainMapping[] = [
  {
    subdomain: 'orchidsushiottawa',  // without .menu.ca
    slug: 'orchid-sushi-245',        // matches /r/[slug] route
    restaurantId: 245,
    name: 'Orchid Sushi Ottawa',
  },
  // Add new restaurant here:
  {
    subdomain: 'newrestaurant',
    slug: 'new-restaurant-999',
    restaurantId: 999,
    name: 'New Restaurant Name',
  },
];
```

### 2. Deploy Changes to Replit

Push the code changes and ensure the deployment is live.

### 3. Add Custom Domain in Replit

1. Go to your Replit deployment settings
2. Navigate to "Custom Domains" section
3. Click "Add Domain"
4. Enter: `newrestaurant.menu.ca`
5. Replit will provide an **A record IP address** (e.g., `34.xxx.xxx.xxx`)
6. Note this IP - you'll need it for DNS configuration

### 4. Update DNS at 1984.is (or your DNS provider)

For migrating from v1/v2:

1. Log into 1984.is DNS management
2. Find the existing A record for `newrestaurant.menu.ca`
   - Current: `A @ 198.27.74.33` (v1 server)
3. Update to point to Replit's IP:
   - New: `A @ [Replit IP from step 3]`

For new subdomains:

1. Add new A record:
   - Type: `A`
   - Name: `newrestaurant` (or full `newrestaurant.menu.ca`)
   - Value: `[Replit IP from step 3]`
   - TTL: 3600 (or lower for faster propagation)

### 5. Wait for SSL & DNS Propagation

- DNS propagation: 5-60 minutes (depends on TTL)
- SSL certificate: Replit auto-provisions (usually < 5 minutes after DNS propagates)

### 6. Verify

1. Visit `https://newrestaurant.menu.ca`
2. Should show the restaurant menu
3. Checkout and other pages should work normally

## Troubleshooting

### "Unknown subdomain" in logs
- Check `lib/subdomain-mapping.ts` has the correct subdomain spelling
- Ensure deployment includes your changes

### SSL certificate error
- DNS might not have propagated yet
- Check A record points to correct Replit IP
- Wait 5-10 minutes and try again

### 404 on subdomain
- Verify restaurant exists in database with correct ID
- Check slug format matches `/r/[slug]` route

### Still showing v1/v2 site
- DNS hasn't propagated yet
- Clear browser cache
- Try incognito mode
- Check with `dig newrestaurant.menu.ca` to verify A record

## Batch Migration Script

For migrating 192 restaurants, consider creating a CSV with:
- subdomain
- slug
- restaurantId
- name

Then generate the `SUBDOMAIN_MAPPINGS` array programmatically.

## Architecture Notes

### How It Works

1. Request comes to `restaurantname.menu.ca`
2. Next.js middleware extracts subdomain from Host header
3. Looks up subdomain in `SUBDOMAIN_MAPPINGS`
4. Rewrites request to `/r/[slug]` (URL stays branded)
5. Restaurant page renders normally

### Files Involved

- `middleware.ts` - Main routing logic
- `lib/subdomain-mapping.ts` - Subdomain → slug mappings
- `app/(public)/r/[slug]/page.tsx` - Restaurant page

### Future Improvements

- Move mappings to database table for dynamic updates
- Admin UI to manage subdomain mappings
- Automatic subdomain suggestions based on restaurant name

# Product Requirements Document (PRD)

# OrderGenie

**Version:** 1.0\
**Platform:** Web + Progressive Web App (PWA)\
**Frontend:** Next.js 16, TypeScript, Tailwind CSS, shadcn/ui\
**Backend:** Node.js, Express.js, TypeScript, Prisma ORM\
**Database:** PostgreSQL\
**Deployment:** Render (Frontend, Backend & PostgreSQL)

------------------------------------------------------------------------

# 1. Product Overview

OrderGenie is a centralized restaurant operations and analytics platform
that aggregates data from Petpooja APIs across multiple outlets.

The application synchronizes Sales, Item Sales, Purchase Orders,
Inventory, and Outlet data into a centralized PostgreSQL database,
enabling fast dashboards, historical reporting, and business
intelligence.

The system is designed for restaurant groups with multiple brands and
outlets.

------------------------------------------------------------------------

# 2. Objectives

-   Centralize restaurant operational data.
-   Eliminate manual report collection.
-   Provide real-time dashboards.
-   Track outlet-wise performance.
-   Analyze item sales.
-   Monitor inventory.
-   Track purchase orders.
-   Support Web and PWA.
-   Scale to hundreds of outlets.

------------------------------------------------------------------------

# 3. User Roles

## Admin

-   Manage users
-   Configure Petpooja APIs
-   Manage outlets
-   View all reports

## Management

-   View dashboards
-   Compare outlets
-   Export reports

## Outlet Manager

-   View assigned outlet
-   Sales
-   Inventory
-   Purchase Orders

------------------------------------------------------------------------

# 4. Technology Stack

## Frontend

-   Next.js 16 (App Router)
-   TypeScript
-   Tailwind CSS
-   shadcn/ui
-   TanStack Query
-   Zustand
-   React Hook Form
-   Zod
-   Recharts
-   next-pwa

## Backend

-   Node.js
-   Express.js
-   TypeScript
-   Prisma ORM
-   PostgreSQL
-   node-cron
-   JWT Authentication

## Deployment

-   Render Static Site / Web Service
-   Render Web Service
-   Render PostgreSQL

No Redis, BullMQ or RabbitMQ.

------------------------------------------------------------------------

# 5. High-Level Architecture

Petpooja APIs ↓ Scheduled Synchronization ↓ Express Backend ↓ PostgreSQL
↓ Next.js Web + PWA

------------------------------------------------------------------------

# 6. Synchronization Strategy

Sales Sync: Every 5 minutes

Inventory Sync: Every 10 minutes

Purchase Orders: Every 15 minutes

Historical Sync: Nightly

Manual Sync option available.

All API data is stored locally for fast reporting.

------------------------------------------------------------------------

# 7. Authentication

Login Screen - Email - Password - Remember Me

JWT-based authentication.

Protected routes.

Role-based access.

------------------------------------------------------------------------

# 8. Application Modules

## Login

Features - Email login - Password reset (future) - Session persistence

------------------------------------------------------------------------

## Dashboard

KPIs - Today's Sales - Yesterday Sales - Monthly Sales - Orders -
Average Bill - Discounts - Taxes - Inventory Value - Purchase Orders -
Low Stock Items

Charts - Sales Trend - Outlet Comparison - Top Selling Items - Hourly
Sales - Payment Breakdown

------------------------------------------------------------------------

## Sales

Features - Daily Sales - Weekly Sales - Monthly Sales - Yearly Sales -
Custom Date Range - Outlet Filters - Export

Sales Table - Invoice Number - Outlet - Date - Time - Customer - Gross -
Discount - Tax - Net - Payment Mode

------------------------------------------------------------------------

## Item Sales

Features - Item-wise Sales - Category Filter - Search - Outlet Filter -
Top Selling - Least Selling

Columns - Item Name - Category - Quantity Sold - Revenue - Average
Price - Discount - Tax

Item Details - Daily Trend - Weekly Trend - Monthly Trend - Outlet
Comparison - Peak Selling Hours

------------------------------------------------------------------------

## Inventory

Features - Current Stock - Opening Stock - Purchased - Consumed -
Closing Stock - Stock Value - Low Stock

Filters - Outlet - Store - Category

------------------------------------------------------------------------

## Purchase Orders

List - PO Number - Vendor - Outlet - Status - Amount - Expected Date

Details - Item List - Quantity - Rate - GST - Received Quantity -
Pending Quantity

------------------------------------------------------------------------

## Outlets

Features - Outlet List - Today's Sales - Inventory Value - Orders -
Purchase Orders

Comparison Dashboard - Revenue - Orders - Average Bill - Growth

------------------------------------------------------------------------

## Reports

Exports - Excel - CSV - PDF

Available Reports - Sales - Item Sales - Inventory - Purchase Orders -
Outlet Comparison - Tax Summary

------------------------------------------------------------------------

## Settings

-   Petpooja API Configuration
-   Sync Schedule
-   Users
-   Roles
-   Notifications

------------------------------------------------------------------------

# 9. Sidebar Navigation

Dashboard

Sales

Item Sales

Inventory

Purchase Orders

Outlets

Reports

Settings

Logout

------------------------------------------------------------------------

# 10. Database Entities

Users

Roles

Outlets

Sales

Sale Items

Inventory

Inventory Transactions

Purchase Orders

Purchase Order Items

Vendors

Sync Logs

------------------------------------------------------------------------

# 11. Backend Folder Structure

backend/ src/ config/ controllers/ middleware/ routes/ services/ auth/
petpooja/ sales/ inventory/ purchase/ outlet/ cron/ prisma/ utils/

------------------------------------------------------------------------

# 12. API Endpoints

POST /api/auth/login

GET /api/dashboard

GET /api/sales

GET /api/sales/items

GET /api/sales/:id

GET /api/inventory

GET /api/inventory/:id

GET /api/purchase-orders

GET /api/outlets

GET /api/reports

POST /api/sync/manual

------------------------------------------------------------------------

# 13. PWA Features

-   Installable
-   Offline shell
-   Mobile responsive
-   Tablet responsive
-   Background sync
-   App icon
-   Splash screen

------------------------------------------------------------------------

# 14. Non-functional Requirements

-   Responsive UI
-   Fast loading
-   Secure JWT authentication
-   Centralized logging
-   Role-based permissions
-   Modular architecture
-   Production-ready deployment on Render

------------------------------------------------------------------------

# 15. Future Enhancements

-   AI-powered insights
-   Sales forecasting
-   Food cost analysis
-   Dead stock detection
-   WhatsApp report delivery
-   Push notifications
-   Multi-brand support
-   Employee performance analytics

------------------------------------------------------------------------

# 16. Milestones

Phase 1 - Authentication - Layout - Dashboard - PWA

Phase 2 - Petpooja integration - Sales sync - Item sales

Phase 3 - Inventory - Purchase Orders - Reports

Phase 4 - AI analytics - Forecasting - Notifications

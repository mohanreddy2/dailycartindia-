{
  "project": {
    "name": "DailyCart (Bharat Hyperlocal Marketplace)",
    "design_goal": "Enterprise-grade, warm + trustworthy India-first marketplace UI (customer) with task-first operational portals (vendor/admin) — one product family, three distinct modes.",
    "brand_attributes": [
      "Warm (human, local)",
      "Trustworthy (clear pricing, verified badges, predictable flows)",
      "Fast (quick add-to-cart, sticky actions, skeletons)",
      "Not metro-luxury cold",
      "No purple/indigo AI gradients",
      "Performance-first for slower networks"
    ],
    "portals": {
      "customer": "Mobile-first commerce + services discovery",
      "vendor": "Desktop-first ops tool with big clear actions",
      "admin": "Clean oversight console, data-dense"
    }
  },

  "visual_personality": {
    "style_fusion": {
      "layout_principles": [
        "Swiggy/Instamart-like commerce hierarchy (location → search → categories → rails)",
        "Zepto-like speed cues (ETA chips, quick add)",
        "Urban Company-like service cards + slot booking clarity",
        "Bento rails + card grids (mobile) + dense tables (vendor/admin)"
      ],
      "surface_style": [
        "Soft-neutral backgrounds with subtle grain",
        "Solid cards (no gradients on reading areas)",
        "Rounded-12 for consumer, rounded-10 for vendor/admin",
        "Micro-shadows + crisp borders"
      ],
      "motion_style": [
        "Snappy, small-distance transitions",
        "Skeleton loaders everywhere",
        "Timeline progress animations",
        "Bottom-sheet/drawer interactions for mobile"
      ]
    }
  },

  "typography": {
    "font_pairing": {
      "heading": {
        "family": "Space Grotesk",
        "google_font": "https://fonts.google.com/specimen/Space+Grotesk",
        "usage": "All headings, KPI numbers, section titles"
      },
      "body": {
        "family": "Figtree",
        "google_font": "https://fonts.google.com/specimen/Figtree",
        "usage": "Body, labels, helper text, tables"
      },
      "constraints": "Use max 2 families. Prefer font-display: swap."
    },
    "type_scale_tailwind": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight",
      "h2": "text-base md:text-lg font-medium text-muted-foreground",
      "h3": "text-lg font-semibold",
      "body": "text-sm md:text-base",
      "small": "text-xs text-muted-foreground",
      "kpi": "text-2xl md:text-3xl font-semibold tabular-nums"
    },
    "numbers": {
      "rule": "Use tabular-nums for prices, order IDs, KPIs.",
      "tailwind": "tabular-nums"
    }
  },

  "color_system": {
    "notes": [
      "Green = Services (Serve)",
      "Orange = Mart/Commerce",
      "Blue = Trust only (verification, info)",
      "Avoid purple/indigo gradients",
      "Use gradients only as decorative section backgrounds (<=20% viewport)"
    ],
    "tokens_hsl_for_shadcn": {
      "base": {
        "background": "36 33% 98%",
        "foreground": "222 47% 11%",
        "card": "0 0% 100%",
        "card-foreground": "222 47% 11%",
        "popover": "0 0% 100%",
        "popover-foreground": "222 47% 11%",
        "muted": "30 20% 96%",
        "muted-foreground": "215 16% 35%",
        "border": "24 14% 88%",
        "input": "24 14% 88%",
        "ring": "24 94% 45%",
        "radius": "0.75rem"
      },
      "brand": {
        "mart": {
          "primary": "24 94% 45%",
          "primary-foreground": "0 0% 100%",
          "accent": "24 90% 96%",
          "accent-foreground": "24 80% 20%"
        },
        "serve": {
          "success": "152 55% 34%",
          "success-foreground": "0 0% 100%",
          "success-soft": "152 45% 94%",
          "success-soft-foreground": "152 55% 18%"
        },
        "trust": {
          "info": "205 85% 42%",
          "info-foreground": "0 0% 100%",
          "info-soft": "205 80% 95%",
          "info-soft-foreground": "205 70% 22%"
        }
      },
      "states": {
        "destructive": "0 84% 55%",
        "destructive-foreground": "0 0% 100%",
        "warning": "43 96% 45%",
        "warning-foreground": "222 47% 11%"
      },
      "charts": {
        "chart-1": "24 94% 45%",
        "chart-2": "152 55% 34%",
        "chart-3": "205 85% 42%",
        "chart-4": "43 96% 45%",
        "chart-5": "222 47% 35%"
      }
    },
    "portal_theming": {
      "customer": {
        "primary": "mart.primary",
        "secondary_accent": "serve.success-soft",
        "background": "warm off-white",
        "notes": "Use orange for CTAs/add-to-cart; green for services badges; blue for verified/trust."
      },
      "vendor": {
        "primary": "152 55% 34%",
        "background": "0 0% 100%",
        "notes": "Task-first: green primary for status advance + confirm actions; orange only for commerce-specific actions (e.g., packing)."
      },
      "admin": {
        "primary": "205 85% 42%",
        "background": "0 0% 100%",
        "notes": "Blue primary for oversight actions; keep neutral surfaces; use semantic badges for states."
      }
    },
    "allowed_gradients": {
      "rule": "Decorative only; never on cards or text-heavy areas; never on small elements; never exceed 20% viewport.",
      "hero_background_customer": "bg-[radial-gradient(1200px_circle_at_20%_0%,hsl(24_90%_92%)_0%,transparent_55%),radial-gradient(900px_circle_at_90%_10%,hsl(152_45%_92%)_0%,transparent_50%)]",
      "hero_background_vendor": "bg-[radial-gradient(900px_circle_at_10%_0%,hsl(152_45%_92%)_0%,transparent_55%),radial-gradient(900px_circle_at_90%_10%,hsl(205_80%_94%)_0%,transparent_50%)]"
    },
    "texture": {
      "grain_overlay_css": ".grain:before{content:'';position:absolute;inset:0;background-image:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22120%22 height=%22120%22 filter=%22url(%23n)%22 opacity=%220.08%22/%3E%3C/svg%3E');mix-blend-mode:multiply;pointer-events:none;}",
      "usage": "Apply to hero wrappers only (position: relative)"
    }
  },

  "layout_and_grid": {
    "customer_mobile": {
      "container": "max-w-[520px] mx-auto px-4",
      "sections": "py-4 md:py-6",
      "rails": "horizontal ScrollArea with snap-x snap-mandatory",
      "bottom_nav": "fixed bottom-0 inset-x-0 h-16 bg-background/95 backdrop-blur border-t"
    },
    "customer_desktop": {
      "container": "max-w-6xl mx-auto px-6",
      "home_grid": "grid grid-cols-12 gap-6",
      "left": "col-span-8",
      "right": "col-span-4 (cart summary / offers / recent orders)"
    },
    "vendor_admin": {
      "shell": "sticky top header + left sidebar (collapsible) + content",
      "content_width": "max-w-[1200px]",
      "tables": "full-width with sticky header row + row hover"
    },
    "spacing_system": {
      "rule": "Use 2–3x more spacing than feels comfortable.",
      "tokens": {
        "xs": "2",
        "sm": "3",
        "md": "4",
        "lg": "6",
        "xl": "8",
        "2xl": "12"
      }
    }
  },

  "components": {
    "component_path": {
      "core": {
        "button": "/app/frontend/src/components/ui/button.jsx",
        "card": "/app/frontend/src/components/ui/card.jsx",
        "badge": "/app/frontend/src/components/ui/badge.jsx",
        "tabs": "/app/frontend/src/components/ui/tabs.jsx",
        "input": "/app/frontend/src/components/ui/input.jsx",
        "command": "/app/frontend/src/components/ui/command.jsx",
        "drawer": "/app/frontend/src/components/ui/drawer.jsx",
        "sheet": "/app/frontend/src/components/ui/sheet.jsx",
        "dialog": "/app/frontend/src/components/ui/dialog.jsx",
        "table": "/app/frontend/src/components/ui/table.jsx",
        "select": "/app/frontend/src/components/ui/select.jsx",
        "calendar": "/app/frontend/src/components/ui/calendar.jsx",
        "input_otp": "/app/frontend/src/components/ui/input-otp.jsx",
        "skeleton": "/app/frontend/src/components/ui/skeleton.jsx",
        "sonner": "/app/frontend/src/components/ui/sonner.jsx",
        "tooltip": "/app/frontend/src/components/ui/tooltip.jsx",
        "progress": "/app/frontend/src/components/ui/progress.jsx",
        "separator": "/app/frontend/src/components/ui/separator.jsx",
        "scroll_area": "/app/frontend/src/components/ui/scroll-area.jsx",
        "pagination": "/app/frontend/src/components/ui/pagination.jsx"
      },
      "navigation": {
        "navigation_menu": "/app/frontend/src/components/ui/navigation-menu.jsx",
        "breadcrumb": "/app/frontend/src/components/ui/breadcrumb.jsx"
      }
    },

    "customer_portal_patterns": {
      "top_location_bar": {
        "layout": "Sticky top bar with location pill + delivery ETA chip + profile icon",
        "shadcn": ["Button", "Popover", "Command", "Input"],
        "details": [
          "Location pill opens Popover with Command search (city/locality autocomplete)",
          "GPS button as ghost icon button",
          "ETA chip uses Badge variant=secondary"
        ],
        "data_testids": [
          "location-picker-button",
          "location-picker-search-input",
          "location-picker-use-gps-button",
          "location-picker-city-option"
        ]
      },
      "universal_search": {
        "pattern": "Command palette style search with grouped results (Products / Stores / Services)",
        "shadcn": ["Command", "Dialog"],
        "microcopy": "Search for ‘milk’, ‘AC repair’, ‘Aashirvaad atta’",
        "data_testids": [
          "universal-search-open-button",
          "universal-search-input",
          "universal-search-result-item"
        ]
      },
      "category_chips": {
        "pattern": "Horizontal chip rail with icons (lucide-react) + active underline",
        "shadcn": ["ToggleGroup"],
        "tailwind": "gap-2 overflow-x-auto no-scrollbar py-2",
        "data_testids": ["category-chip"]
      },
      "store_card": {
        "pattern": "Card with store name, distance chip, rating pill, KYC verified badge, open/close status",
        "shadcn": ["Card", "Badge", "Avatar"],
        "states": [
          "Open: green dot + ‘Open now’",
          "Closed: muted + ‘Opens at 8:00 AM’"
        ],
        "data_testids": ["store-card", "store-card-open-status", "store-card-verified-badge"]
      },
      "product_tile": {
        "pattern": "Image + name + size + price + strike MRP + Add button (stepper after add)",
        "shadcn": ["Card", "Button", "Badge"],
        "micro_interactions": [
          "Add → morph into qty stepper (− 1 +)",
          "Low stock badge pulses subtly (opacity)"
        ],
        "data_testids": [
          "product-tile",
          "product-add-button",
          "product-qty-increment-button",
          "product-qty-decrement-button",
          "product-price-text"
        ]
      },
      "multi_vendor_cart_drawer": {
        "pattern": "Bottom Drawer grouped by store with collapsible sections + per-store subtotal + overall checkout CTA",
        "shadcn": ["Drawer", "Collapsible", "Separator", "Button"],
        "details": [
          "Each store group shows delivery fee + min order hint",
          "Sticky checkout bar inside drawer"
        ],
        "data_testids": [
          "cart-drawer-open-button",
          "cart-drawer",
          "cart-store-group",
          "cart-checkout-button"
        ]
      },
      "checkout": {
        "pattern": "COD-first checkout with address card, delivery instructions, payment method tabs",
        "shadcn": ["Card", "Tabs", "RadioGroup", "Textarea", "Button"],
        "data_testids": [
          "checkout-address-card",
          "checkout-payment-tabs",
          "checkout-cod-option",
          "checkout-place-order-button"
        ]
      },
      "status_timeline": {
        "pattern": "Vertical timeline with step dots + labels + timestamps; active step highlighted",
        "implementation": {
          "approach": "Custom component using Tailwind + Separator; no external lib needed",
          "tailwind": {
            "rail": "relative pl-8",
            "dot": "absolute left-0 top-1 size-3 rounded-full border bg-background",
            "dot_active": "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]",
            "line": "absolute left-[5px] top-4 bottom-0 w-px bg-border"
          }
        },
        "data_testids": ["order-status-timeline", "order-status-step"]
      },
      "service_booking_slot_picker": {
        "pattern": "Date picker + time slot chips + confirm CTA",
        "shadcn": ["Calendar", "ToggleGroup", "Button"],
        "details": [
          "Disable unavailable dates",
          "Show ‘Fastest available’ chip"
        ],
        "data_testids": [
          "service-booking-calendar",
          "service-booking-slot-chip",
          "service-booking-confirm-button"
        ]
      },
      "auth": {
        "pattern": "Tabs: Email/Password + Phone OTP; dev OTP display in a muted Alert",
        "shadcn": ["Tabs", "Input", "InputOTP", "Alert", "Button"],
        "data_testids": [
          "auth-tabs",
          "auth-email-input",
          "auth-password-input",
          "auth-phone-input",
          "auth-otp-input",
          "auth-submit-button",
          "auth-dev-otp-alert"
        ]
      },
      "mobile_bottom_nav": {
        "pattern": "4 tabs: Home, Search, Cart, Account; cart shows badge count",
        "icons": "lucide-react",
        "tailwind": "fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75",
        "data_testids": ["bottom-nav", "bottom-nav-home", "bottom-nav-search", "bottom-nav-cart", "bottom-nav-account"]
      }
    },

    "vendor_portal_patterns": {
      "dashboard_kpis": {
        "pattern": "KPI cards (Today orders, Pending, Earnings, Rating) + sparkline",
        "shadcn": ["Card", "Badge"],
        "library": {
          "optional": "recharts",
          "use": "Tiny line chart inside KPI card"
        },
        "data_testids": ["vendor-kpi-card"]
      },
      "order_queue": {
        "pattern": "Table with sticky header + row actions: Accept → Picking → Ready → Out for delivery → Delivered",
        "shadcn": ["Table", "Button", "Badge", "DropdownMenu"],
        "interaction": "One-click primary action button per row; secondary actions in dropdown",
        "data_testids": ["vendor-orders-table", "vendor-order-advance-status-button", "vendor-order-row"]
      },
      "inventory_manager": {
        "pattern": "CRUD table with inline edit drawer; low-stock filter; bulk update",
        "shadcn": ["Table", "Drawer", "Input", "Select", "Button", "Badge"],
        "data_testids": ["vendor-inventory-table", "inventory-add-product-button", "inventory-edit-product-button", "inventory-save-button"]
      },
      "availability_weekly_grid": {
        "pattern": "7-day grid with time blocks; toggle availability; copy day",
        "shadcn": ["Toggle", "Card", "Button"],
        "data_testids": ["availability-grid", "availability-day-toggle", "availability-copy-day-button"]
      },
      "onboarding_wizard": {
        "pattern": "Step-by-step wizard with progress + save & continue",
        "shadcn": ["Progress", "Card", "Form", "Input", "Select", "Button"],
        "data_testids": ["vendor-onboarding", "vendor-onboarding-next-button", "vendor-onboarding-step"]
      },
      "kyc_pending_gate": {
        "pattern": "Centered card (not whole app centered) with clear status + what happens next",
        "shadcn": ["Card", "Alert", "Button"],
        "data_testids": ["vendor-kyc-pending", "vendor-kyc-upload-button"]
      }
    },

    "admin_portal_patterns": {
      "kpi_overview": {
        "pattern": "KPI cards + recent activity feed + charts",
        "shadcn": ["Card", "Table", "Badge"],
        "library": {
          "recommended": "recharts",
          "charts": ["GMV line", "Orders bar", "KYC approvals stacked"]
        },
        "data_testids": ["admin-kpi-card", "admin-recent-activity"]
      },
      "kyc_review_queue": {
        "pattern": "Segmented tabs: Unreviewed / In review / Reviewed; side panel for doc preview; approve/reject",
        "shadcn": ["Tabs", "Table", "Sheet", "Button", "Badge"],
        "data_testids": ["admin-kyc-tabs", "admin-kyc-table", "admin-kyc-approve-button", "admin-kyc-reject-button"]
      },
      "disputes_queue": {
        "pattern": "Table + severity badge + resolve dialog with notes",
        "shadcn": ["Table", "Badge", "Dialog", "Textarea", "Button"],
        "data_testids": ["admin-disputes-table", "admin-dispute-resolve-button", "admin-dispute-resolve-dialog"]
      }
    }
  },

  "buttons": {
    "style": "Professional-warm (rounded 10–12, subtle elevation)",
    "tokens": {
      "btn_radius": "rounded-xl",
      "btn_shadow": "shadow-sm hover:shadow-md",
      "btn_motion": "transition-colors transition-shadow duration-200",
      "btn_press": "active:scale-[0.98]"
    },
    "variants": {
      "primary_mart": "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.92)]",
      "primary_serve": "bg-[hsl(152_55%_34%)] text-white hover:bg-[hsl(152_55%_30%)]",
      "primary_trust": "bg-[hsl(205_85%_42%)] text-white hover:bg-[hsl(205_85%_38%)]",
      "secondary": "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary)/0.8)]",
      "ghost": "hover:bg-[hsl(var(--accent))]"
    },
    "data_testids": ["primary-cta-button", "secondary-button", "ghost-button"]
  },

  "motion_and_microinteractions": {
    "library": {
      "recommended": "framer-motion",
      "install": "npm i framer-motion",
      "usage": [
        "Page transitions: fade + 8px slide",
        "Drawer open: spring",
        "Add-to-cart morph: layoutId animation"
      ]
    },
    "principles": [
      "No universal transition: never transition: all",
      "Prefer transition-colors, transition-shadow, transition-opacity",
      "Hover: lift 1–2px on cards (translate-y-[-1px]) with shadow change",
      "Press: active scale 0.98 on primary buttons",
      "Skeletons for all rails and tables"
    ],
    "scroll": {
      "customer": "Sticky search bar after 64px scroll; category chips remain visible",
      "vendor_admin": "Sticky table header + sticky action bar for filters"
    }
  },

  "accessibility": {
    "requirements": [
      "WCAG AA contrast for text on buttons and badges",
      "Focus rings visible: ring-2 ring-[hsl(var(--ring))] ring-offset-2",
      "Tap targets >= 44px",
      "Use aria-label for icon-only buttons",
      "Prefer sentence-case labels (Indian English)"
    ],
    "empty_states": {
      "pattern": "Illustration (optional) + clear next action button",
      "shadcn": ["Card", "Button"],
      "data_testids": ["empty-state", "empty-state-primary-action"]
    }
  },

  "performance": {
    "rules": [
      "Use responsive images (sizes/srcset if applicable)",
      "Defer non-critical charts",
      "Use Skeleton component for perceived performance",
      "Avoid heavy background videos"
    ]
  },

  "image_urls": {
    "customer_hero_backgrounds": [
      {
        "url": "https://images.unsplash.com/photo-1661022166287-1d1ae8dfaec4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjBncm9jZXJ5JTIwZnJlc2glMjBwcm9kdWNlJTIwZmxhdCUyMGxheXxlbnwwfHx8b3JhbmdlfDE3ODM2MDczOTl8MA&ixlib=rb-4.1.0&q=85",
        "category": "customer",
        "description": "Warm produce flat-lay for hero/offer banner background (use with overlay + blur, not behind text-heavy blocks)."
      },
      {
        "url": "https://images.unsplash.com/photo-1607930231977-1c1668f74067?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwyfHxpbmRpYW4lMjBncm9jZXJ5JTIwZnJlc2glMjBwcm9kdWNlJTIwZmxhdCUyMGxheXxlbnwwfHx8b3JhbmdlfDE3ODM2MDczOTl8MA&ixlib=rb-4.1.0&q=85",
        "category": "customer",
        "description": "Tomato flat-lay for category header banners (keep gradient overlay mild)."
      }
    ],
    "service_provider_visuals": [
      {
        "url": "https://images.unsplash.com/photo-1659355894515-2548f35525f1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2ODl8MHwxfHNlYXJjaHwyfHxpbmRpYW4lMjBob21lJTIwc2VydmljZXMlMjBlbGVjdHJpY2lhbiUyMHBsdW1iZXIlMjB0ZWNobmljaWFufGVufDB8fHxncmVlbnwxNzgzNjA3NDA1fDA&ixlib=rb-4.1.0&q=85",
        "category": "customer",
        "description": "Service hero image placeholder (technician vibe). Use as cover with rounded corners."
      }
    ],
    "local_kirana_context": [
      {
        "url": "https://images.unsplash.com/photo-1657363366014-14c978e40429?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1Mjh8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjBraXJhbmElMjBzdG9yZSUyMHNob3BrZWVwZXIlMjBjb3VudGVyfGVufDB8fHxibHVlfDE3ODM2MDc0MTN8MA&ixlib=rb-4.1.0&q=85",
        "category": "customer",
        "description": "Local store context image for onboarding/empty states (use sparingly)."
      }
    ]
  },

  "instructions_to_main_agent": {
    "phased_plan": {
      "phase_1_app_correctness": [
        "Normalize IA: three portal shells with shared tokens but distinct primary colors.",
        "Implement core flows end-to-end: location → browse → add → multi-vendor cart → COD checkout → tracking timeline.",
        "Implement service booking: provider detail → slot picker → booking confirmation → booking timeline.",
        "Vendor: onboarding wizard + KYC pending gate + order/job queues with one-click status advance.",
        "Admin: KPI dashboard + KYC review queue + disputes resolve flow.",
        "Add skeleton loaders and empty states for every list/rail/table.",
        "Add data-testid to every interactive + key informational element (prices, statuses, totals, errors)."
      ],
      "phase_2_enterprise_uiux_uplift": [
        "Replace App.css CRA leftovers; avoid centered app container.",
        "Update index.css tokens to the provided HSL system; keep dark mode optional but not default.",
        "Build reusable primitives: StatusTimeline, RatingPill, DistanceChip, VerifiedBadge, PriceStack (MRP/discount), StickyBottomCTA.",
        "Customer: bottom nav on mobile; desktop split layout with cart summary.",
        "Vendor/Admin: sidebar shell + dense tables + sticky filters; add recharts for KPIs.",
        "Add framer-motion for micro-interactions and page transitions."
      ]
    },
    "implementation_notes_js": [
      "Repo uses .js (not .tsx): write components in React .jsx/.js with prop-types optional.",
      "Use shadcn/ui components from /src/components/ui; do not use raw HTML dropdown/calendar/toast.",
      "Use lucide-react icons (no emoji icons).",
      "Use sonner for toasts via /src/components/ui/sonner.jsx."
    ],
    "testing": {
      "data_testid_convention": "kebab-case describing role (not appearance).",
      "examples": [
        "data-testid=\"cart-checkout-button\"",
        "data-testid=\"order-status-step\"",
        "data-testid=\"vendor-order-advance-status-button\""
      ]
    }
  },

  "GRADIENT_RESTRICTION_RULE": {
    "prohibited": [
      "blue-500 to purple-600",
      "purple-500 to pink-500",
      "green-500 to blue-500",
      "red to pink"
    ],
    "never": [
      "Use dark/saturated gradient combos on any UI element",
      "Let gradients cover more than 20% of the viewport",
      "Apply gradients to text-heavy content or reading areas",
      "Use gradients on small UI elements (<100px width)",
      "Stack multiple gradient layers in the same viewport"
    ],
    "enforcement": "If gradient area exceeds 20% of viewport OR affects readability, then use solid colors.",
    "allowed_usage": [
      "Section backgrounds (not content backgrounds)",
      "Hero section header content (background only)",
      "Decorative overlays and accent elements only",
      "Hero section with 2-3 mild colors"
    ]
  },

  "general_ui_ux_design_guidelines_appendix": [
    "- You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms",
    "- You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text",
    "- NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json",
    "\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals."
  ]
}

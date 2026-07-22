"""DailyCart India-wide demo seed — dense multi-city catalog + live vendor/admin activity.
Run: python seed.py --force
"""
import asyncio
import random
import sys
from datetime import datetime, timedelta, timezone

from core import db, new_id, now_iso, hash_password, ORDER_FLOW, BOOKING_FLOW

random.seed(42)

# ---------- images (Unsplash thumbs) ----------
IMG = {
    "rice": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=60",
    "milk": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=60",
    "oil": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=60",
    "atta": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=60",
    "curd": "https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=400&q=60",
    "tomato": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&q=60",
    "onion": "https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=400&q=60",
    "potato": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=60",
    "banana": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&q=60",
    "apple": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&q=60",
    "bread": "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400&q=60",
    "eggs": "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&q=60",
    "tea": "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=400&q=60",
    "sugar": "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=400&q=60",
    "dal": "https://images.unsplash.com/photo-1610725664285-7c57e6eeac3f?w=400&q=60",
    "salt": "https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=400&q=60",
    "biscuit": "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&q=60",
    "soap": "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=400&q=60",
    "shampoo": "https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=400&q=60",
    "detergent": "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=400&q=60",
    "paneer": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&q=60",
    "ghee": "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400&q=60",
    "chilli": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&q=60",
    "turmeric": "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&q=60",
    "namkeen": "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&q=60",
    "juice": "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=400&q=60",
    "noodles": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=60",
    "pooja": "https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=400&q=60",
    "incense": "https://images.unsplash.com/photo-1478144592103-25e218a04891?w=400&q=60",
    "notebook": "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400&q=60",
    "pen": "https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=400&q=60",
    "frozen": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&q=60",
    "icecream": "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&q=60",
    "diaper": "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&q=60",
    "petfood": "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&q=60",
    "pickle": "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&q=60",
    "papad": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=60",
    "coffee": "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&q=60",
    "chips": "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=60",
    "store": "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&q=60",
    "store2": "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&q=60",
    "store3": "https://images.unsplash.com/photo-1601600576337-c1d8a0d1373c?w=600&q=60",
    "store4": "https://images.unsplash.com/photo-1580913428023-02c695666d61?w=600&q=60",
    "store5": "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=600&q=60",
    "store6": "https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?w=600&q=60",
    "plumber": "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&q=60",
    "electrician": "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&q=60",
    "cleaning": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=60",
    "ac": "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=60",
    "ac2": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&q=60",
    "beauty": "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=60",
    "appliance": "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=600&q=60",
    "ironing": "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=600&q=60",
    "laundry": "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&q=60",
    "cobbler": "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&q=60",
    "tailor": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=60",
    "tiffin": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=60",
    "mehendi": "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=600&q=60",
    "pest": "https://images.unsplash.com/photo-1581579186913-45ac3e6efe93?w=600&q=60",
    "ro": "https://images.unsplash.com/photo-1564419320461-6870880221ad?w=600&q=60",
    "stove": "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&q=60",
    "cctv": "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&q=60",
    "carwash": "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=600&q=60",
    "movers": "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=600&q=60",
    "carpenter": "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&q=60",
    "pandit": "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=60",
}

CITIES = [
    {"name": "Hyderabad", "state": "Telangana", "lat": 17.3850, "lng": 78.4867},
    {"name": "Bangalore", "state": "Karnataka", "lat": 12.9716, "lng": 77.5946},
    {"name": "Visakhapatnam", "state": "Andhra Pradesh", "lat": 17.6868, "lng": 83.2185},
    {"name": "Bhimavaram", "state": "Andhra Pradesh", "lat": 16.5449, "lng": 81.5212},
    {"name": "Pune", "state": "Maharashtra", "lat": 18.5204, "lng": 73.8567},
    {"name": "Delhi", "state": "Delhi", "lat": 28.6139, "lng": 77.2090},
    {"name": "Mumbai", "state": "Maharashtra", "lat": 19.0760, "lng": 72.8777},
    {"name": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lng": 80.2707},
]
SUPPLY_CITIES = CITIES  # all cities get supply for partner demos

CATEGORIES = [
    {"slug": "grocery", "name": "Grocery & Staples", "kind": "product", "icon": "shopping-basket"},
    {"slug": "dairy", "name": "Dairy & Eggs", "kind": "product", "icon": "milk"},
    {"slug": "fruits-veg", "name": "Fruits & Vegetables", "kind": "product", "icon": "apple"},
    {"slug": "snacks", "name": "Snacks & Beverages", "kind": "product", "icon": "cookie"},
    {"slug": "household", "name": "Household & Personal Care", "kind": "product", "icon": "spray-can"},
    {"slug": "pooja", "name": "Pooja & Festival", "kind": "product", "icon": "flame"},
    {"slug": "stationery", "name": "Stationery & School", "kind": "product", "icon": "pen-line"},
    {"slug": "frozen", "name": "Frozen & Bakery", "kind": "product", "icon": "snowflake"},
    {"slug": "baby-pet", "name": "Baby & Pet Care", "kind": "product", "icon": "baby"},
    {"slug": "plumber", "name": "Plumbing", "kind": "service", "icon": "wrench"},
    {"slug": "electrician", "name": "Electrical", "kind": "service", "icon": "zap"},
    {"slug": "cleaning", "name": "Home Cleaning", "kind": "service", "icon": "sparkles"},
    {"slug": "ac-repair", "name": "AC Repair", "kind": "service", "icon": "snowflake"},
    {"slug": "beauty", "name": "Salon & Beauty", "kind": "service", "icon": "scissors"},
    {"slug": "appliance", "name": "Appliance Repair", "kind": "service", "icon": "settings"},
    {"slug": "ironing", "name": "Ironing & Laundry", "kind": "service", "icon": "shirt"},
    {"slug": "cobbler", "name": "Cobbler & Shoe Care", "kind": "service", "icon": "footprints"},
    {"slug": "tailor", "name": "Tailoring", "kind": "service", "icon": "scissors"},
    {"slug": "tiffin", "name": "Tiffin & Home Cook", "kind": "service", "icon": "utensils"},
    {"slug": "pest", "name": "Pest & Mosquito", "kind": "service", "icon": "bug"},
    {"slug": "ro-water", "name": "RO & Water", "kind": "service", "icon": "droplets"},
    {"slug": "kitchen-repair", "name": "Gas Stove & Chimney", "kind": "service", "icon": "flame"},
    {"slug": "cctv", "name": "CCTV & Security", "kind": "service", "icon": "camera"},
    {"slug": "car-wash", "name": "Car / Bike Wash", "kind": "service", "icon": "car"},
    {"slug": "movers", "name": "Packers & Mini Movers", "kind": "service", "icon": "truck"},
    {"slug": "carpenter", "name": "Carpentry", "kind": "service", "icon": "hammer"},
    {"slug": "pooja-service", "name": "Pandit & Pooja", "kind": "service", "icon": "flame"},
]

MASTER_PRODUCTS = [
    ("Sona Masoori Rice", "grocery", 68, 75, "1 kg", "rice"),
    ("Basmati Rice Premium", "grocery", 145, 160, "1 kg", "rice"),
    ("Idli Rice", "grocery", 55, 62, "1 kg", "rice"),
    ("Whole Wheat Atta", "grocery", 260, 285, "5 kg", "atta"),
    ("Multigrain Atta", "grocery", 95, 110, "1 kg", "atta"),
    ("Toor Dal", "grocery", 155, 170, "1 kg", "dal"),
    ("Moong Dal", "grocery", 130, 142, "1 kg", "dal"),
    ("Chana Dal", "grocery", 98, 110, "1 kg", "dal"),
    ("Urad Dal", "grocery", 140, 155, "1 kg", "dal"),
    ("Sunflower Oil", "grocery", 145, 158, "1 L", "oil"),
    ("Groundnut Oil", "grocery", 210, 230, "1 L", "oil"),
    ("Mustard Oil", "grocery", 175, 190, "1 L", "oil"),
    ("Iodised Salt", "grocery", 24, 28, "1 kg", "salt"),
    ("Sugar", "grocery", 46, 52, "1 kg", "sugar"),
    ("Jaggery Cubes", "grocery", 65, 75, "500 g", "sugar"),
    ("Red Chilli Powder", "grocery", 88, 95, "200 g", "chilli"),
    ("Turmeric Powder", "grocery", 52, 58, "200 g", "turmeric"),
    ("Garam Masala", "grocery", 72, 85, "100 g", "turmeric"),
    ("Assam Tea", "snacks", 140, 155, "250 g", "tea"),
    ("Filter Coffee Powder", "snacks", 220, 250, "250 g", "coffee"),
    ("Instant Coffee", "snacks", 185, 210, "100 g", "coffee"),
    ("Marie Biscuits", "snacks", 30, 35, "250 g", "biscuit"),
    ("Good Day Cookies", "snacks", 35, 40, "200 g", "biscuit"),
    ("Haldiram Mixture", "snacks", 55, 65, "200 g", "namkeen"),
    ("Potato Chips", "snacks", 20, 25, "50 g", "chips"),
    ("Maggi Noodles 4-pack", "snacks", 56, 64, "4 pcs", "noodles"),
    ("Mango Juice 1L", "snacks", 85, 99, "1 L", "juice"),
    ("Fresh Milk", "dairy", 28, 30, "500 ml", "milk"),
    ("Full Cream Milk", "dairy", 33, 36, "500 ml", "milk"),
    ("Toned Milk", "dairy", 26, 28, "500 ml", "milk"),
    ("Fresh Curd", "dairy", 35, 40, "400 g", "curd"),
    ("Buttermilk", "dairy", 18, 22, "200 ml", "curd"),
    ("Paneer", "dairy", 90, 99, "200 g", "paneer"),
    ("Pure Cow Ghee", "dairy", 320, 350, "500 ml", "ghee"),
    ("Farm Eggs", "dairy", 84, 90, "12 pcs", "eggs"),
    ("Tomatoes", "fruits-veg", 32, 38, "1 kg", "tomato"),
    ("Onions", "fruits-veg", 35, 42, "1 kg", "onion"),
    ("Potatoes", "fruits-veg", 28, 34, "1 kg", "potato"),
    ("Bananas", "fruits-veg", 48, 55, "1 dozen", "banana"),
    ("Apples Shimla", "fruits-veg", 160, 180, "1 kg", "apple"),
    ("Green Chillies", "fruits-veg", 40, 50, "250 g", "chilli"),
    ("Coriander Bunch", "fruits-veg", 15, 20, "1 bunch", "tomato"),
    ("Lemon", "fruits-veg", 60, 70, "1 kg", "apple"),
    ("Bath Soap", "household", 38, 42, "100 g", "soap"),
    ("Handwash Liquid", "household", 99, 115, "250 ml", "soap"),
    ("Shampoo", "household", 185, 199, "340 ml", "shampoo"),
    ("Hair Oil", "household", 120, 140, "200 ml", "shampoo"),
    ("Detergent Powder", "household", 115, 125, "1 kg", "detergent"),
    ("Dishwash Bar", "household", 25, 30, "200 g", "detergent"),
    ("Floor Cleaner", "household", 145, 165, "1 L", "detergent"),
    ("Toilet Cleaner", "household", 95, 110, "500 ml", "detergent"),
    ("Agarbatti Pack", "pooja", 45, 55, "1 pack", "incense"),
    ("Camphor Tablets", "pooja", 35, 42, "50 g", "pooja"),
    ("Kumkum & Haldi Set", "pooja", 40, 50, "1 set", "pooja"),
    ("Cotton Wicks", "pooja", 20, 25, "1 pack", "pooja"),
    ("Diya Set (6)", "pooja", 60, 75, "6 pcs", "pooja"),
    ("Notebook Classmate", "stationery", 45, 55, "1 pc", "notebook"),
    ("Ball Pen Pack (10)", "stationery", 50, 60, "10 pcs", "pen"),
    ("Geometry Box", "stationery", 120, 140, "1 pc", "pen"),
    ("Brown Cover Roll", "stationery", 35, 40, "1 roll", "notebook"),
    ("Frozen Peas", "frozen", 55, 65, "500 g", "frozen"),
    ("Frozen Paratha Pack", "frozen", 90, 110, "5 pcs", "frozen"),
    ("Vanilla Ice Cream", "frozen", 180, 210, "500 ml", "icecream"),
    ("Brown Bread", "frozen", 45, 50, "400 g", "bread"),
    ("Pav Bun Pack", "frozen", 30, 35, "6 pcs", "bread"),
    ("Rusk Toast", "frozen", 40, 48, "200 g", "biscuit"),
    ("Baby Diapers M", "baby-pet", 399, 450, "28 pcs", "diaper"),
    ("Baby Wipes", "baby-pet", 99, 120, "72 pcs", "diaper"),
    ("Dog Food 1kg", "baby-pet", 280, 320, "1 kg", "petfood"),
    ("Mango Pickle", "grocery", 120, 140, "500 g", "pickle"),
    ("Urad Papad", "grocery", 55, 65, "200 g", "papad"),
]

STORE_TEMPLATES = [
    ("Sri Lakshmi Kirana", "store", "Neighbourhood kirana — staples, dairy, pooja items."),
    ("Green Valley Mart", "store2", "Fresh veggies + daily essentials, open early."),
    ("Annapurna Super Store", "store3", "Family provision store with frozen & bakery."),
    ("Balaji General Stores", "store4", "Kirana + stationery for school kids."),
    ("Om Sai Kirana & Dairy", "store5", "Milk, curd, ghee and grocery under one roof."),
    ("City Fresh Mart", "store6", "Quick commerce style neighbourhood mart."),
    ("New Bharat Provision", "store", "Wholesale-feel prices for home kitchens."),
    ("Apna Bazaar Corner", "store2", "Snacks, beverages, household care."),
    ("Gokul Dairy & Grocery", "store3", "Dairy-first store with staples aisle."),
    ("Metro Kirana Express", "store4", "Fast pick packs for busy apartments."),
    ("Sri Venkateswara Stores", "store5", "Pooja samagri + grocery combo."),
    ("Amma Mini Mart", "store6", "Women-run kirana with homemade pickles."),
]

# Hyperlocal service archetypes — goldmines included
SERVICE_ARCHETYPES = [
    {"name": "{first} Press & Ironing", "cats": ["ironing"], "img": "ironing",
     "services": [
         ("Shirt / Kurta Ironing (per pc)", "ironing", 12, 15),
         ("Saree Ironing", "ironing", 40, 25),
         ("Bulk Ironing — 10 pcs", "ironing", 99, 60),
         ("Wash & Fold (per kg)", "ironing", 80, 45),
         ("Express Same-Day Ironing (5 pcs)", "ironing", 149, 40),
     ]},
    {"name": "{first} Laundry Hub", "cats": ["ironing"], "img": "laundry",
     "services": [
         ("Wash & Iron Combo (5 pcs)", "ironing", 199, 90),
         ("Dry Clean Blazer", "ironing", 249, 60),
         ("Bedsheet Wash", "ironing", 120, 45),
         ("Curtain Wash (per panel)", "ironing", 180, 60),
     ]},
    {"name": "{first} Cobbler At Door", "cats": ["cobbler"], "img": "cobbler",
     "services": [
         ("Sole / Heel Fix", "cobbler", 149, 40),
         ("Zip Replacement", "cobbler", 199, 45),
         ("Shoe Polish Pair", "cobbler", 79, 20),
         ("Bag Strap Repair", "cobbler", 249, 50),
         ("School Shoe Stitch", "cobbler", 99, 30),
     ]},
    {"name": "{first} Tailor Express", "cats": ["tailor"], "img": "tailor",
     "services": [
         ("Pant / Jeans Hemming", "tailor", 99, 30),
         ("Blouse Alteration", "tailor", 199, 45),
         ("Saree Fall & Pico", "tailor", 149, 40),
         ("Kurta Fitting Adjust", "tailor", 179, 40),
         ("Button / Hook Fix (3)", "tailor", 49, 15),
     ]},
    {"name": "{first} Home Tiffin", "cats": ["tiffin"], "img": "tiffin",
     "services": [
         ("Veg Lunch Dabba (1 meal)", "tiffin", 120, 30),
         ("Dinner Dabba (1 meal)", "tiffin", 130, 30),
         ("Weekly Lunch Plan (5 days)", "tiffin", 549, 0),
         ("Festival Sweets Tray (small)", "tiffin", 399, 60),
         ("Cook On Call (2 hrs)", "tiffin", 449, 120),
     ]},
    {"name": "{first} Plumbing Pro", "cats": ["plumber"], "img": "plumber",
     "services": [
         ("Tap Leak Fix", "plumber", 249, 40),
         ("Blocked Drain Clear", "plumber", 399, 60),
         ("Mixer Tap Install", "plumber", 549, 75),
         ("Western Toilet Seat Fix", "plumber", 349, 45),
         ("Water Tank Overflow Fix", "plumber", 499, 60),
     ]},
    {"name": "{first} Electricals", "cats": ["electrician", "ac-repair"], "img": "electrician",
     "services": [
         ("Switchboard Repair", "electrician", 299, 45),
         ("Ceiling Fan Install", "electrician", 249, 40),
         ("Tube / LED Fitting", "electrician", 199, 30),
         ("AC Gas Top-up", "ac-repair", 899, 75),
         ("AC Deep Service Split", "ac-repair", 649, 70),
     ]},
    {"name": "{first} Sparkle Clean", "cats": ["cleaning"], "img": "cleaning",
     "services": [
         ("1BHK Deep Cleaning", "cleaning", 1299, 180),
         ("2BHK Deep Cleaning", "cleaning", 1899, 240),
         ("Kitchen Deep Clean", "cleaning", 899, 120),
         ("Bathroom Deep Clean", "cleaning", 499, 60),
         ("Sofa Shampoo (3 seater)", "cleaning", 699, 90),
     ]},
    {"name": "{first} Beauty At Home", "cats": ["beauty"], "img": "beauty",
     "services": [
         ("Haircut At Home", "beauty", 349, 45),
         ("Facial Cleanup", "beauty", 699, 60),
         ("Threading + Wax Arms", "beauty", 399, 45),
         ("Mehendi Hands Simple", "beauty", 249, 40),
         ("Bridal Mehendi Package", "beauty", 2999, 150),
     ]},
    {"name": "{first} Mehendi Artist", "cats": ["beauty"], "img": "mehendi",
     "services": [
         ("Arabic Mehendi Hands", "beauty", 399, 50),
         ("Feet Mehendi", "beauty", 299, 40),
         ("Kids Mehendi Fun", "beauty", 149, 25),
         ("Engagement Mehendi Duo", "beauty", 1499, 90),
     ]},
    {"name": "{first} Appliance Care", "cats": ["appliance", "kitchen-repair"], "img": "appliance",
     "services": [
         ("Washing Machine Repair", "appliance", 449, 60),
         ("Fridge Cooling Issue", "appliance", 499, 60),
         ("Microwave Repair", "appliance", 349, 45),
         ("Gas Stove Service", "kitchen-repair", 349, 45),
         ("Chimney Deep Clean", "kitchen-repair", 899, 75),
     ]},
    {"name": "{first} RO & Water", "cats": ["ro-water"], "img": "ro",
     "services": [
         ("RO Basic Service", "ro-water", 399, 45),
         ("RO Filter Change (labour)", "ro-water", 299, 40),
         ("RO Installation", "ro-water", 799, 90),
         ("Water Purifier Checkup", "ro-water", 249, 30),
     ]},
    {"name": "{first} Pest Guard", "cats": ["pest"], "img": "pest",
     "services": [
         ("Mosquito Fogging 1BHK", "pest", 499, 45),
         ("Cockroach Gel Treatment", "pest", 899, 60),
         ("Bed Bug Treatment Room", "pest", 1299, 90),
         ("Society Lane Fogging", "pest", 1999, 60),
     ]},
    {"name": "{first} SecureCam", "cats": ["cctv"], "img": "cctv",
     "services": [
         ("CCTV Camera Install (1)", "cctv", 799, 60),
         ("DVR Setup & Config", "cctv", 1499, 90),
         ("Camera Angle Reposition", "cctv", 349, 30),
         ("Video Doorbell Install", "cctv", 599, 45),
     ]},
    {"name": "{first} Shine Wash", "cats": ["car-wash"], "img": "carwash",
     "services": [
         ("Car Wash At Home", "car-wash", 399, 45),
         ("Car Interior Vacuum", "car-wash", 299, 40),
         ("Bike Wash & Polish", "car-wash", 149, 25),
         ("Foam Wash Premium Car", "car-wash", 599, 60),
     ]},
    {"name": "{first} Mini Movers", "cats": ["movers"], "img": "movers",
     "services": [
         ("In-Society Floor Shift", "movers", 1499, 120),
         ("2 Helpers + Tempo (local)", "movers", 3499, 180),
         ("Furniture Assemble (1 item)", "movers", 499, 60),
         ("Appliance Shift In Home", "movers", 399, 45),
     ]},
    {"name": "{first} WoodWorks", "cats": ["carpenter"], "img": "carpenter",
     "services": [
         ("Door Latch / Handle Fix", "carpenter", 199, 30),
         ("Shelf Install", "carpenter", 449, 60),
         ("Hinge Replacement", "carpenter", 249, 40),
         ("TV Unit Minor Fix", "carpenter", 349, 45),
     ]},
    {"name": "{first} Pooja Seva", "cats": ["pooja-service"], "img": "pandit",
     "services": [
         ("Griha Pravesh Pooja", "pooja-service", 2499, 120),
         ("Satyanarayan Katha", "pooja-service", 1999, 90),
         ("Birthday / Naming Pooja", "pooja-service", 1499, 75),
         ("Pooja Samagri + Pandit Combo", "pooja-service", 2999, 120),
     ]},
]

FIRST_NAMES = [
    "Ravi", "Suresh", "Anand", "Kiran", "Mohan", "Prakash", "Deepa", "Sunita", "Rajesh", "Venkat",
    "Arjun", "Meena", "Lakshmi", "Naresh", "Priya", "Gopal", "Kavitha", "Srinivas", "Anitha", "Babu",
    "Chitra", "Harish", "Jyothi", "Madhu", "Naveen", "Padma", "Ramesh", "Shanti", "Usha", "Yadav",
]

WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
DEFAULT_SLOTS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"]
CUST_NAMES = [
    ("Ananya Reddy", "ananya"), ("Vikram Shah", "vikram"), ("Fatima Begum", "fatima"),
    ("Rohan Mehta", "rohan"), ("Sneha Iyer", "sneha"), ("Karthik Rao", "karthik"),
    ("Pooja Nair", "pooja"), ("Imran Khan", "imran"), ("Divya Patel", "divya"),
    ("Sanjay Gupta", "sanjay"), ("Neha Joshi", "neha"), ("Arun Das", "arun"),
]


def jitter(base, spread=0.025):
    return base + random.uniform(-spread, spread)


def ago(days=0, hours=0):
    return (datetime.now(timezone.utc) - timedelta(days=days, hours=hours)).isoformat()


def gen_no(prefix):
    return prefix + "".join(random.choices("0123456789", k=6))


async def ensure_indexes():
    await db.vendors.create_index([("location", "2dsphere")])
    await db.vendors.create_index("user_id")
    await db.products.create_index("vendor_id")
    await db.services.create_index("vendor_id")
    await db.orders.create_index("customer_id")
    await db.orders.create_index("vendor_id")
    await db.bookings.create_index("customer_id")
    await db.bookings.create_index("vendor_id")
    await db.users.create_index("email")
    await db.users.create_index("phone")
    await db.payment_intents.create_index("id", unique=True)
    await db.payment_intents.create_index([("user_id", 1), ("created_at", -1)])


async def seed_activity(demo_mart, demo_svc, all_marts, all_svcs, customers, pw):
    """Fill vendor queues + admin dashboards with realistic history."""
    orders_n = bookings_n = reviews_n = disputes_n = 0

    def hist(flow, upto):
        idx = flow.index(upto)
        out = []
        for i, st in enumerate(flow[: idx + 1]):
            out.append({"status": st, "at": ago(days=max(0, 3 - i), hours=i * 2), "by": "system" if i == 0 else "vendor"})
        return out

    # --- Orders: weight demo mart heavily so DailyPro queue looks alive ---
    peers = [m for m in all_marts if m["city"] == demo_mart["city"] and m["id"] != demo_mart["id"]][:2]
    status_plan = (
        ["placed"] * 6 + ["accepted"] * 4 + ["picking"] * 3 + ["ready"] * 3
        + ["out_for_delivery"] * 3 + ["delivered"] * 14 + ["cancelled"] * 2
    )
    for i, status in enumerate(status_plan):
        # ~70% on demo mart
        store = demo_mart if (i % 10 < 7 or not peers) else peers[i % len(peers)]
        prods = await db.products.find({"vendor_id": store["id"]}).to_list(8)
        if len(prods) < 2:
            continue
        picks = random.sample(prods, k=min(len(prods), random.randint(2, 4)))
        cust = customers[i % len(customers)]
        items = []
        sub = 0.0
        for p in picks:
            qty = random.randint(1, 3)
            line = round(p["price"] * qty, 2)
            sub += line
            items.append({"product_id": p["id"], "name": p["name"], "price": p["price"], "qty": qty, "line_total": line})
        fee = float(store.get("delivery_fee") or 25)
        total = round(sub + fee, 2)
        oid = new_id()
        created = ago(days=random.randint(0, 12), hours=random.randint(0, 20))
        order = {
            "id": oid, "order_no": gen_no("DC"), "checkout_group_id": new_id(),
            "customer_id": cust["id"], "customer_name": cust["name"],
            "vendor_id": store["id"], "store_name": store["name"], "city": store["city"],
            "items": items, "subtotal": sub, "delivery_fee": fee, "total": total,
            "payment_method": "cod", "status": status,
            "status_history": hist(ORDER_FLOW, status) if status in ORDER_FLOW else [
                {"status": "placed", "at": created, "by": "system"},
                {"status": status, "at": ago(hours=1), "by": "customer" if status == "cancelled" else "vendor"},
            ],
            "address": {"label": "Home", "line": f"{random.randint(10, 99)}, Demo Colony", "city": store["city"],
                        "lat": store["location"]["coordinates"][1], "lng": store["location"]["coordinates"][0]},
            "created_at": created,
        }
        await db.orders.insert_one(order)
        orders_n += 1
        if status == "delivered" and random.random() < 0.7:
            await db.reviews.insert_one({
                "id": new_id(), "customer_id": cust["id"], "customer_name": cust["name"],
                "vendor_id": store["id"], "order_id": oid, "rating": random.randint(4, 5),
                "comment": random.choice([
                    "Fresh stock, on time!", "Packaging was neat.", "Will order again.",
                    "Kirana quality like our old shop.", "Delivery boy polite.",
                ]),
                "created_at": ago(days=random.randint(0, 5)),
            })
            reviews_n += 1

    # --- Bookings: weight demo ironing pro ---
    svc_peers = [v for v in all_svcs if v["city"] == demo_svc["city"] and v["id"] != demo_svc["id"]][:3]
    b_plan = (
        ["requested"] * 6 + ["accepted"] * 4 + ["en_route"] * 3 + ["in_progress"] * 3
        + ["completed"] * 12 + ["cancelled"] * 2
    )
    for i, status in enumerate(b_plan):
        vendor = demo_svc if (i % 10 < 7 or not svc_peers) else svc_peers[i % len(svc_peers)]
        svcs = await db.services.find({"vendor_id": vendor["id"]}).to_list(10)
        if not svcs:
            continue
        svc = random.choice(svcs)
        cust = customers[(i + 3) % len(customers)]
        day = (datetime.now(timezone.utc) + timedelta(days=random.randint(-5, 5))).strftime("%Y-%m-%d")
        slot = random.choice(DEFAULT_SLOTS)
        bid = new_id()
        booking = {
            "id": bid, "booking_no": gen_no("DS"),
            "customer_id": cust["id"], "customer_name": cust["name"],
            "vendor_id": vendor["id"], "vendor_name": vendor["name"],
            "service_id": svc["id"], "service_name": svc["name"],
            "price": float(svc["base_price"]), "duration_minutes": svc.get("duration_minutes", 60),
            "slot_date": day, "slot_time": slot,
            "status": status,
            "status_history": hist(BOOKING_FLOW, status) if status in BOOKING_FLOW else [
                {"status": "requested", "at": ago(days=1), "by": "system"},
                {"status": status, "at": ago(hours=2), "by": "customer"},
            ],
            "address": {"label": "Home", "line": f"Flat {random.randint(101, 908)}, Pearl Residency",
                        "city": vendor["city"], "lat": vendor["location"]["coordinates"][1],
                        "lng": vendor["location"]["coordinates"][0]},
            "notes": random.choice([None, "Call on arrival", "Gate code 4321", "Prefer afternoon"]),
            "created_at": ago(days=random.randint(0, 10), hours=random.randint(0, 12)),
        }
        await db.bookings.insert_one(booking)
        bookings_n += 1
        if status == "completed" and random.random() < 0.75:
            await db.reviews.insert_one({
                "id": new_id(), "customer_id": cust["id"], "customer_name": cust["name"],
                "vendor_id": vendor["id"], "booking_id": bid, "rating": random.randint(4, 5),
                "comment": random.choice([
                    "Came on time, neat work.", "Fair price, recommend.", "Very professional.",
                    "Fixed it in one visit.", "Will book again for ironing!",
                ]),
                "created_at": ago(days=random.randint(0, 4)),
            })
            reviews_n += 1

    # Recompute a few vendor ratings from reviews
    for v in [demo_mart, demo_svc]:
        revs = await db.reviews.find({"vendor_id": v["id"]}).to_list(200)
        if revs:
            avg = round(sum(r["rating"] for r in revs) / len(revs), 1)
            await db.vendors.update_one({"id": v["id"]}, {"$set": {"rating": avg, "review_count": len(revs)}})

    # Disputes — open + resolved for admin
    delivered = await db.orders.find({"status": "delivered"}).to_list(5)
    for i, o in enumerate(delivered[:3]):
        did = new_id()
        open_d = i == 0
        doc = {
            "id": did, "customer_id": o["customer_id"], "customer_name": o["customer_name"],
            "order_id": o["id"], "subject": random.choice([
                "Missing item in bag", "Wrong product delivered", "Late delivery complaint",
            ]),
            "description": "Raised during partner demo seed for admin Ops console.",
            "status": "open" if open_d else "resolved",
            "created_at": ago(days=2 - i),
        }
        if not open_d:
            doc["resolution"] = "Refunded delivery fee / replacement arranged."
            doc["resolved_at"] = ago(days=1)
            doc["resolved_by"] = "usr-demo-admin"
        await db.disputes.insert_one(doc)
        disputes_n += 1

    print(f"Activity: {orders_n} orders, {bookings_n} bookings, {reviews_n} reviews, {disputes_n} disputes")


async def seed(force=False):
    existing = await db.vendors.count_documents({})
    if existing > 0 and not force:
        print(f"Seed skipped: {existing} vendors already present. Use --force to reseed.")
        await ensure_indexes()
        return

    if force:
        for col in ("users", "vendors", "products", "services", "categories", "cities",
                    "orders", "bookings", "reviews", "disputes", "otps", "audit_log"):
            await db[col].delete_many({})

    await ensure_indexes()
    await db.cities.insert_many([dict(c, id=new_id()) for c in CITIES])
    await db.categories.insert_many([dict(c, id=new_id()) for c in CATEGORIES])

    pw = hash_password("Demo@123")
    await db.users.insert_many([
        {"id": "usr-demo-customer", "name": "Lakshmi Devi", "email": "customer@dailycart.in",
         "phone": "9999900001", "password_hash": pw, "capabilities": ["customer"], "created_at": now_iso()},
        {"id": "usr-demo-admin", "name": "Ops Admin", "email": "admin@dailycart.in",
         "phone": "9999900099", "password_hash": hash_password("Admin@123"),
         "capabilities": ["admin", "customer"], "created_at": now_iso()},
    ])

    # Extra demo customers for activity
    customers = [{"id": "usr-demo-customer", "name": "Lakshmi Devi"}]
    for i, (cname, slug) in enumerate(CUST_NAMES):
        uid = new_id()
        await db.users.insert_one({
            "id": uid, "name": cname, "email": f"{slug}@demo.dailycart.in",
            "phone": f"98888{10000 + i}", "password_hash": pw,
            "capabilities": ["customer"], "created_at": now_iso(),
        })
        customers.append({"id": uid, "name": cname})

    stores_created = 0
    vendors_created = 0
    store_idx = 0
    name_idx = 0
    all_marts = []
    all_svcs = []
    demo_mart = demo_svc = None

    STORES_PER_CITY = 4
    PROS_PER_CITY = 6

    for ci, city in enumerate(SUPPLY_CITIES):
        for s in range(STORES_PER_CITY):
            tmpl_name, img_key, desc = STORE_TEMPLATES[store_idx % len(STORE_TEMPLATES)]
            store_idx += 1
            demo_owner = ci == 0 and s == 0
            store_name = tmpl_name if demo_owner else f"{tmpl_name} — {city['name']}"
            owner = {
                "id": "usr-demo-mart" if demo_owner else new_id(),
                "name": f"{store_name} Owner",
                "email": "vendor.mart@dailycart.in" if demo_owner else f"store{store_idx}@dailycart.in",
                "phone": "9999900004" if demo_owner else f"98{random.randint(10000000, 99999999)}",
                "password_hash": pw, "capabilities": ["customer", "mart_vendor"], "created_at": now_iso(),
            }
            await db.users.insert_one(dict(owner))
            cats = ["grocery", "dairy", "fruits-veg", "snacks", "household"]
            if s % 2 == 0:
                cats += ["pooja", "stationery"]
            if s % 3 == 0:
                cats += ["frozen", "baby-pet"]
            vendor = {
                "id": new_id(), "user_id": owner["id"], "type": "mart", "name": store_name,
                "description": desc, "category_slugs": cats,
                "address": f"{random.randint(1, 120)}, {random.choice(['Main Road', 'Market Street', 'Colony Cross', 'Ring Road'])}, {city['name']}",
                "city": city["name"],
                "location": {"type": "Point", "coordinates": [jitter(city["lng"]), jitter(city["lat"])]},
                "image": IMG[img_key],
                "rating": round(random.uniform(3.9, 4.9), 1),
                "review_count": random.randint(18, 140),
                "min_order": random.choice([0, 99, 149]),
                "delivery_fee": random.choice([15, 20, 25, 30]),
                "kyc_status": "approved",
                "kyc": {"id_type": "gstin", "id_number": f"36AA{random.randint(10000, 99999)}C1Z{random.randint(0, 9)}",
                        "submitted_at": ago(days=30), "decided_at": ago(days=28)},
                "is_active": True, "is_open": True, "availability": None, "created_at": ago(days=40),
            }
            await db.vendors.insert_one(dict(vendor))
            all_marts.append(vendor)
            if demo_owner:
                demo_mart = vendor
            stores_created += 1
            eligible = [p for p in MASTER_PRODUCTS if p[1] in cats]
            k = min(len(eligible), random.randint(22, min(36, len(eligible))))
            picks = random.sample(eligible, k=k)
            for (pname, cat, price, mrp, unit, img) in picks:
                await db.products.insert_one({
                    "id": new_id(), "vendor_id": vendor["id"], "name": pname, "category_slug": cat,
                    "price": float(price + random.choice([-3, -1, 0, 0, 2, 4])), "mrp": float(mrp),
                    "unit": unit, "stock_qty": random.randint(20, 180),
                    "image": IMG.get(img, IMG["store"]), "is_available": True, "created_at": now_iso(),
                })

        for s in range(PROS_PER_CITY):
            arch = SERVICE_ARCHETYPES[(ci * PROS_PER_CITY + s) % len(SERVICE_ARCHETYPES)]
            first = FIRST_NAMES[name_idx % len(FIRST_NAMES)]
            name_idx += 1
            v_name = arch["name"].format(first=first)
            if not (ci == 0 and s == 0):
                v_name = f"{v_name} · {city['name']}"
            demo_owner = ci == 0 and s == 0
            # Prefer ironing archetype as demo service for goldmine story
            if demo_owner:
                arch = SERVICE_ARCHETYPES[0]  # Press & Ironing
                v_name = arch["name"].format(first="Ravi")
            owner = {
                "id": "usr-demo-service" if demo_owner else new_id(),
                "name": f"{first} Kumar",
                "email": "vendor.service@dailycart.in" if demo_owner else f"pro{ci}{s}_{store_idx}@dailycart.in",
                "phone": "9999900003" if demo_owner else f"97{random.randint(10000000, 99999999)}",
                "password_hash": pw, "capabilities": ["customer", "service_vendor"], "created_at": now_iso(),
            }
            await db.users.insert_one(dict(owner))
            vendor = {
                "id": new_id(), "user_id": owner["id"], "type": "service", "name": v_name,
                "description": "Verified local professional. Upfront pricing. Neighbourhood trusted.",
                "category_slugs": arch["cats"],
                "address": f"{random.randint(1, 99)}, Service Lane, {city['name']}",
                "city": city["name"],
                "location": {"type": "Point", "coordinates": [jitter(city["lng"]), jitter(city["lat"])]},
                "image": IMG[arch["img"]],
                "rating": round(random.uniform(4.1, 4.95), 1),
                "review_count": random.randint(10, 90),
                "min_order": 0, "delivery_fee": 0,
                "kyc_status": "approved",
                "kyc": {"id_type": "aadhaar", "id_number": f"XXXX-XXXX-{random.randint(1000, 9999)}",
                        "submitted_at": ago(days=20), "decided_at": ago(days=18)},
                "is_active": True, "is_open": True,
                "availability": {d: list(DEFAULT_SLOTS) for d in WEEKDAYS},
                "created_at": ago(days=35),
            }
            await db.vendors.insert_one(dict(vendor))
            all_svcs.append(vendor)
            if demo_owner:
                demo_svc = vendor
            vendors_created += 1
            for (sname, cat, price, dur) in arch["services"]:
                await db.services.insert_one({
                    "id": new_id(), "vendor_id": vendor["id"], "name": sname, "category_slug": cat,
                    "description": f"{sname} by {v_name}. Includes visit + standard materials unless noted.",
                    "base_price": float(price), "duration_minutes": dur or 30,
                    "image": IMG[arch["img"]], "is_available": True, "created_at": now_iso(),
                })

    # Pending KYC vendors for admin queue (mart + service + ironing)
    hyd = SUPPLY_CITIES[0]
    pending_specs = [
        ("Fresh Start Kirana (New)", "mart", ["grocery"], "store", "mart_vendor", "gstin"),
        ("QuickPress Ironing (New)", "service", ["ironing"], "ironing", "service_vendor", "aadhaar"),
        ("Namma Cobbler Hub (New)", "service", ["cobbler"], "cobbler", "service_vendor", "aadhaar"),
    ]
    for pname, ptype, pcats, pimg, cap, idt in pending_specs:
        oid = new_id()
        await db.users.insert_one({
            "id": oid, "name": f"{pname} Owner", "email": f"pending.{ptype}.{oid[:6]}@dailycart.in",
            "phone": f"96{random.randint(10000000, 99999999)}", "password_hash": pw,
            "capabilities": ["customer", cap], "created_at": now_iso(),
        })
        await db.vendors.insert_one({
            "id": new_id(), "user_id": oid, "type": ptype, "name": pname,
            "description": "Newly registered — awaiting KYC verification.",
            "category_slugs": pcats, "address": "12, New Colony", "city": hyd["name"],
            "location": {"type": "Point", "coordinates": [jitter(hyd["lng"]), jitter(hyd["lat"])]},
            "image": IMG[pimg], "rating": 0, "review_count": 0, "min_order": 0, "delivery_fee": 25 if ptype == "mart" else 0,
            "kyc_status": "pending",
            "kyc": {"id_type": idt, "id_number": "PENDING-VERIFY", "submitted_at": ago(hours=6)},
            "is_active": True, "is_open": True,
            "availability": {d: list(DEFAULT_SLOTS) for d in WEEKDAYS} if ptype == "service" else None,
            "created_at": ago(hours=8),
        })

    await seed_activity(demo_mart, demo_svc, all_marts, all_svcs, customers, pw)

    total_products = await db.products.count_documents({})
    total_services = await db.services.count_documents({})
    print(f"Seeded: {len(CITIES)} cities, {stores_created} stores, {vendors_created} service vendors, "
          f"{total_products} products, {total_services} services + demo accounts + activity")


if __name__ == "__main__":
    asyncio.run(seed(force="--force" in sys.argv))

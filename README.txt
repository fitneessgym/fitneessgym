Fitness Gym - fixed admin files

Replace these files in the GitHub repository:
1. admin.html
2. admin.js
3. admin-store.js
4. supabase-config.js (unchanged)

admin.html now loads Supabase JS and supabase-config.js before the admin scripts.

Important:
- This version uses Supabase instead of localStorage for customers, invoices, payments and products.
- The existing database tables/data are not deleted by these files.
- The homepage product section still requires the site's index.html/product rendering code to be updated separately if it is not already present.

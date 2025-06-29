# Project Wif - E-Commerce SPA

This document outlines the architecture and design of this project to facilitate development and collaboration, particularly with AI coding assistants.

## 1. Project Overview

This project is a Single-Page Application (SPA) for a simple e-commerce website. It is built entirely with client-side technologies. The rendering logic, data fetching, and routing are all handled in the browser.

## 2. Core Technologies

- **jQuery**: Used for DOM manipulation, event handling, and AJAX.
- **jQuery-tmpl**: The templating engine used to render dynamic HTML from data. All view templates are written using this engine's syntax.
- **SQL.js**: A JavaScript library that provides a relational database (SQLite) in the browser. All application data is stored and queried from this client-side database.

## 3. Architecture

The application follows a simple, client-side architecture pattern.

### 3.1. Client-Side Database

The entire application state (products, reviews, etc.) is stored in a client-side SQLite database.

- **Database File**: The database is loaded from a static file: `wif.db.sqlite`.
- **Schema**: The database schema is defined in `data/schema.sql`.
- **Initial Data**: The database is pre-populated with data from `data/initial_data.sql`.
- **DB Interaction**: The script `assets/js/db.js` handles loading the database file and provides a global `window.db` object for interaction. The helper function `queryDatabase(sql)` is used to execute queries.

### 3.2. Templating and Views

Views are defined as jQuery-tmpl templates located in the `tmpl/` directory.

- **Templates**: Each "page" (e.g., product list, product details) has its own template file (e.g., `tmpl/productListTemplate.html`).
- **Rendering**: Templates are populated with data fetched from the client-side database. They use syntax like `${variable}` and `{{each ...}}`.

### 3.3. Routing and Application Logic

The application logic is primarily contained within `assets/js/wif.js`. It manages routing and the data-loading lifecycle for each view.

- **Routing**: The application uses hash-based routing (e.g., `index.html#productDetails?id=1`). The `getParamsFromHash()` function parses parameters from the URL hash.
- **Page Load Lifecycle**: A simple convention is used for loading views:
    - **`[viewName]_before_load()`**: This function is executed *before* a view's template is rendered. It is responsible for fetching the necessary data from the database using `queryDatabase()`. It should return a jQuery promise that resolves with the data object for the template.
    - **`[viewName]__after_load()`**: This function is executed *after* a view's template has been rendered and added to the DOM. It can be used for post-render logic like initializing plugins or event listeners.

## 4. Development Workflow

### How to Modify the Database

1.  Modify `data/schema.sql` (for schema changes) or `data/initial_data.sql` (for data changes).
2.  Re-generate the database file by running the following commands from the project root:
    ```bash
    rm wif.db.sqlite
    sqlite3 wif.db.sqlite < data/schema.sql
    sqlite3 wif.db.sqlite < data/initial_data.sql
    ```
3.  Reload the application in your browser.

### How to Add a New View

1.  Create a new template file in the `tmpl/` directory (e.g., `tmpl/myNewViewTemplate.html`).
2.  In `assets/js/wif.js`, create a `myNewView_before_load()` function to fetch data for the template.
3.  Link to the new view using a hash URL (e.g., `#myNewView`). The framework will automatically call the corresponding `_before_load` function.

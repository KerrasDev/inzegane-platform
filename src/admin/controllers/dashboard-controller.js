/**
 * src/admin/controllers/dashboard-controller.js
 *
 * Inzegane Platform — Admin Dashboard Controller
 *
 * This module handles the logic for the admin dashboard page. It initializes
 * the database explorer component and renders the admin navigation.
 */
import { renderAdminNav } from '../../admin.js';
import { DatabaseExplorer } from '../database-explorer.js';

renderAdminNav('dashboard');
new DatabaseExplorer('database-explorer-root');
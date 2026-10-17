import type { AdminSession } from './lib/adminTypes';

declare global {
  namespace App {
    interface Locals {
      adminSession: AdminSession | null;
    }
  }
}

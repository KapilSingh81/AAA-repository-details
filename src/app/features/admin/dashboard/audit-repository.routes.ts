import { Routes } from "@angular/router";
import { ManageDashboard } from "./pages/manage-dashboard/manage-dashboard";
import { GenerateNewDocument } from "./components/generate-new-document/generate-new-document";

export const ROUTES: Routes = [
    {
        path: 'repository',
        component: ManageDashboard,
    },
    {
        path: 'generate-document',
        component: GenerateNewDocument
    }
]
import { Routes } from "@angular/router";
import { ManageDashboard } from "./dashboard/pages/manage-dashboard/manage-dashboard";
import { ProjectDetails } from "./dashboard/components/project-detatils/project-detatils";

export const ROUTES: Routes = [
    {
        path: 'dashboard', loadChildren: () => import('./main-dashboard/main-dashbaord.routes').then(m => m.MAIN_DASHBOARD)
    },
    {
        path: 'workspace', component: ManageDashboard,
    },
    {
        path: 'project-details/:id',
        component: ProjectDetails
    }
]
import { Routes } from '@angular/router';
import { ManageAuditReview } from './pages/manage-audit-review/manage-audit-review';

export const AUDIT_REVIEW: Routes = [
    {
        path: 'repository',
        component: ManageAuditReview,
    },
];
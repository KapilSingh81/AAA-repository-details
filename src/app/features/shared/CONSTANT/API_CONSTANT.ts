export const API_CONSTANT = {
  login: 'v1/token',
  refreshToken: 'v1/token/refresh',
  logout: 'v1/token/logout',
  resetPwd: 'v1/reset-password',

  dashboardList: 'projects',
  documentTypeList: 'documents/types',
  addUploadDoumnet: 'documents/upload',
  documentDetails: 'project/details/{projectId}',

  dashboard: 'dashboard/me',
  generateDocument: 'documents/generate',
  statusOptions: 'documents/status-options',
  documentById: 'documents/generate/{id}',
  updateDocument: 'documents/draft/{id}',
  addEvidance: 'documents/{project_id}/evidence',

  generateCertificate: 'certificates/generate',
  finalizeDocument: 'documents/{project_id}/finalize',
  regenerateCertificate: 'certificates/{project_id}/regenerate',
  certificateTimeline: 'certificates/{project_id}/timeline',
  reuploadDocument: 'documents/{project_id}/reupload',
  uploadSigningAssets: 'documents/{project_id}/signing-assets',
  reportApproval: 'admin/documents/{project_id}/approval',

  adminReportStatus: 'admin/reports/status',
  myNotifications: 'notifications/me',
  markAllNotificationsRead: 'notifications/read-all',
  downloadReportPdf: 'documents/download/{report_id}/pdf',
  downloadCertificatePdf: 'certificates/download/{cert_id}/pdf',
  pendingApprovals: 'admin/reports/pending-approval',
reviewApproval: 'admin/documents/{project_id}/approval',
};
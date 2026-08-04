export const API_CONSTANT = {
    //auth api 
    login: 'v1/token',
    refreshToken: 'v1/token/refresh',
    logout: 'v1/token/logout',
    resetPwd : 'v1/reset-password',

    // dashboard api start here 
    dashboardList : 'projects',
    documentTypeList : 'documents/types',
    addUploadDoumnet : 'documents/upload',
    documentDetails :'project/details/{projectId}',

}
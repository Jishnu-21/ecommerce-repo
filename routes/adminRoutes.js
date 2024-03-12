const express = require('express');
const adminController = require('../controllers/adminController');
const router = express.Router();
const authController = require('../controllers/authController');
const multer = require('multer');


const upload = multer().none();

const { updateUserStatus } = adminController;
const { updateProductStatus } = adminController;
const { updateCategory } = adminController;
const { updateCategoryStatus } = adminController;

router.post('/product/status', updateProductStatus);
router.post('/product/approval', adminController.productApproval);
router.post('/product/delete', adminController.productDelete);

router.get('/api/bar-chart',adminController.barChart)

router.post('/admin/status', updateUserStatus);
router.post('/category/status', updateCategoryStatus);
router.post('/catEdit',upload, updateCategory);
router.post('/category/add',upload, adminController.addCategory);
router.post('/coupon/add',upload, adminController.addCoupon);
router.post('/coupon/status', adminController.updateCouponStatus);
router.post('/coupon/edit',upload, adminController.updateCoupon);
router.post('/banner/add', adminController.addBanner);
router.post('/banner/edit', adminController.editBanner);
router.post('/orders/updateStatus',adminController.updateStatus)


router.get('/export-sales', (req, res) => {
    const interval = req.query.interval; // Extract interval from query parameters
    adminController.downloadSales(req, res, interval); // Pass interval along with req and res to the controller
});



router.get('/sales-report/download',adminController.getCustomDateSalesReport,adminController.downloadCustomDateSalesReport);


router.post('/LoginAdmin',adminController.loginAdmin);
router.get('/adminLogin',authController.isAdmin,adminController.renderAdminloginPage);


router.get('/admin',authController.notAdmin,adminController.renderAdminSales);
router.get('/admin/Products',authController.notAdmin, adminController.renderAdminProductsPage);
router.get('/admin/category',authController.notAdmin,adminController.renderAdminCategoryPage);
router.get('/admin/Users',authController.notAdmin, adminController.renderAdminUsersPage);
router.get('/admin/coupon', authController.notAdmin, adminController.renderAdminCouponPage);
router.get('/admin/Orders',authController.notAdmin, adminController.renderAdminOrders);
router.get('/user-details/:userId', adminController.renderUserDetails);
router.get('/admin/banner', authController.notAdmin, adminController.renderBanner);


router.get('/api/chart-data', adminController.getChartData);
router.get('/api/product-sales', adminController.getProductSalesData);
router.get('/api/monthly-sales', adminController.getMonthlyTotalSales);



module.exports = router;

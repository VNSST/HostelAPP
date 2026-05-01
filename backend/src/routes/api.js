const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const destDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, destDir); },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const { verifyToken, verifyOwnerRole, verifyTenantRole } = require('../middleware/auth');

const authController        = require('../controllers/auth.controller');
const tenantController      = require('../controllers/tenant.controller');
const paymentController     = require('../controllers/payment.controller');
const dashboardController   = require('../controllers/dashboard.controller');
const roomsController       = require('../controllers/rooms.controller');
const otpService            = require('../services/otp.service');

// ─── OTP ─────────────────────────────────────────────────────────────────────
router.post('/auth/send-otp', otpService.sendOTP);
router.post('/auth/verify-otp', otpService.verifyOTP);

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/login', authController.login);
router.post('/auth/register_owner', otpService.requireEmailVerification, authController.registerOwner);
router.post('/auth/register_tenant', otpService.requireEmailVerification, authController.registerTenant);

// ─── Profile ─────────────────────────────────────────────────────────────────
router.get('/profile/owner', [verifyToken, verifyOwnerRole], authController.getOwnerProfile);
router.get('/profile/tenant', [verifyToken, verifyTenantRole], authController.getTenantProfile);

// ─── Rooms (Public — for tenant signup dropdown) ──────────────────────────────
router.get('/rooms/public/:hostelId', roomsController.getRoomsPublic);

// ─── Rooms (Owner) ───────────────────────────────────────────────────────────
router.get('/rooms',             [verifyToken, verifyOwnerRole], roomsController.listRooms);
router.post('/rooms',            [verifyToken, verifyOwnerRole], roomsController.addRoom);
router.put('/rooms/:id',         [verifyToken, verifyOwnerRole], roomsController.updateRoom);
router.delete('/rooms/:id',      [verifyToken, verifyOwnerRole], roomsController.deleteRoom);
router.post('/rooms/bulk',       roomsController.bulkAddRooms); // called after owner registration (no auth yet)

// ─── Tenant Management (Owner) ───────────────────────────────────────────────
router.get('/tenants',           [verifyToken, verifyOwnerRole], tenantController.listTenants);
router.get('/tenants/:id',       [verifyToken, verifyOwnerRole], tenantController.getTenant);
router.put('/tenants/:id',       [verifyToken, verifyOwnerRole], tenantController.updateTenant);
router.delete('/tenants/:id',    [verifyToken, verifyOwnerRole], tenantController.deleteTenant);

// ─── Tenant Self ─────────────────────────────────────────────────────────────
router.get('/tenant/me',         [verifyToken, verifyTenantRole], tenantController.getTenantMe);
router.get('/tenant/payments',   [verifyToken, verifyTenantRole], paymentController.getTenantPayments);
router.delete('/tenant/me',      [verifyToken, verifyTenantRole], tenantController.tenantSelfRemove);

// ─── Payment Submission (Tenant) ─────────────────────────────────────────────
router.post('/payments', [verifyToken, verifyTenantRole, upload.single('screenshot')], paymentController.submitPayment);

// ─── Cash Approval (Owner) ───────────────────────────────────────────────────
router.post('/payments/:id/confirm',      [verifyToken, verifyOwnerRole], paymentController.confirmPayment);
router.post('/payments/:id/reject',       [verifyToken, verifyOwnerRole], paymentController.rejectPayment);

// ─── Dashboard (Owner) ───────────────────────────────────────────────────────
router.get('/dashboard/summary',  [verifyToken, verifyOwnerRole], dashboardController.getSummary);
router.get('/dashboard/payments', [verifyToken, verifyOwnerRole], dashboardController.getPaymentsList);

module.exports = router;

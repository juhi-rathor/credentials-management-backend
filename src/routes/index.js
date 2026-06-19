const router = require("express").Router();

const adminRoutes = require("./adminRoute");

router.use("/admin", adminRoutes);

module.exports = router;


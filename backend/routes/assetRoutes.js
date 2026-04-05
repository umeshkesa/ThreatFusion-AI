const express = require("express");
const router = express.Router();

const {
  createAsset,
  getAssets
} = require("../controllers/assetController");

router.post("/add", createAsset);
router.get("/:company_id", getAssets);

module.exports = router;
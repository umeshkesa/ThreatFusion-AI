const express = require("express");
const router = express.Router();

const {
  createAsset,
  getAssets,
  deleteAsset,
  deleteSoftware
} = require("../controllers/assetController");

router.post("/add", createAsset);
router.get("/:company_id", getAssets);
router.delete("/delete/:id", deleteAsset);
router.delete("/:assetId/software/:softwareId", deleteSoftware);

module.exports = router;
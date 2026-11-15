const express = require("express");
const router = express.Router();

const {
  ocrFront,
  ocrBack,
  saveCitizen,
  fetchCitizen,
  updateCitizen,
} = require("../controllers/citizenController");

router.post("/ocr/front", ocrFront);
router.post("/ocr/back", ocrBack);

router.post("/", saveCitizen);
router.get("/email/:emailid", fetchCitizen);
router.put("/:id", updateCitizen);

module.exports = router;

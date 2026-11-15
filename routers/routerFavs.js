const express = require("express");
const router = express.Router();
const Favs = require("../models/modelFavs");
const Vendor = require("../models/modelVendor");

const cleanEmail = (value) => String(value || "").trim().toLowerCase();

// GET /favs/:citizenemail -> fetch saved vendor email IDs and vendor cards
router.get("/:citizenemail", async (req, res) => {
  try {
    const citizenemail = cleanEmail(req.params.citizenemail);
    if (!citizenemail) return res.status(400).json({ status: false, message: "Citizen email is required" });
    const fav = await Favs.findOne({ citizenemail });
    const vendoremails = fav ? fav.vendoremails : [];
    const vendors = vendoremails.length ? await Vendor.find({ emailid: { $in: vendoremails } }) : [];
    // Keep the saved order in the same order as vendoremails
    const byEmail = new Map(vendors.map(v => [v.emailid.toLowerCase(), v]));
    const orderedVendors = vendoremails.map(email => byEmail.get(email)).filter(Boolean);
    return res.json({ status: true, citizenemail, vendoremails, vendors: orderedVendors });
  } catch (err) { return res.status(500).json({ status: false, message: err.message }); }
});

// POST /favs/toggle -> add or remove vendor email from a citizen's favorites
router.post("/toggle", async (req, res) => {
  try {
    const citizenemail = cleanEmail(req.body.citizenemail);
    const vendoremail = cleanEmail(req.body.vendoremail);
    if (!citizenemail || !vendoremail) return res.status(400).json({ status: false, message: "Citizen email and vendor email are required" });
    const vendor = await Vendor.findOne({ emailid: vendoremail });
    if (!vendor) return res.status(404).json({ status: false, message: "Vendor not found" });

    let fav = await Favs.findOne({ citizenemail });
    if (!fav) fav = new Favs({ citizenemail, vendoremails: [] });
    const alreadySaved = fav.vendoremails.includes(vendoremail);
    if (alreadySaved) fav.vendoremails = fav.vendoremails.filter(email => email !== vendoremail);
    else fav.vendoremails.push(vendoremail);
    await fav.save();
    return res.json({ status: true, action: alreadySaved ? "removed" : "added", vendoremails: fav.vendoremails });
  } catch (err) { return res.status(500).json({ status: false, message: err.message }); }
});

// DELETE /favs/remove -> remove a vendor from a citizen's favorites
router.delete("/remove", async (req, res) => {
  try {
    const citizenemail = cleanEmail(req.body.citizenemail);
    const vendoremail = cleanEmail(req.body.vendoremail);
    if (!citizenemail || !vendoremail) return res.status(400).json({ status: false, message: "Citizen email and vendor email are required" });
    const fav = await Favs.findOneAndUpdate({ citizenemail }, { $pull: { vendoremails: vendoremail } }, { new: true });
    return res.json({ status: true, vendoremails: fav ? fav.vendoremails : [] });
  } catch (err) { return res.status(500).json({ status: false, message: err.message }); }
});
module.exports = router;

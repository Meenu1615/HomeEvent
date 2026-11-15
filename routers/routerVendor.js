var express = require("express");
var router = express.Router();
var path = require("path");
var fs = require("fs");
var Vendor = require("../models/modelVendor");

// Ensure uploads folder exists
var uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Helper to save file locally via express-fileupload
const saveLocalFile = (file, prefix) => {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const ext = path.extname(file.name);
    const fileName = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const targetPath = path.join(uploadDir, fileName);

    file.mv(targetPath, (err) => {
      if (err) return reject(err);
      resolve(`http://localhost:2005/uploads/${fileName}`);
    });
  });
};

// 1. FETCH VENDOR BY EMAIL: /vendor/fetch?emailid=...
router.get("/fetch", async function (req, resp) {
  try {
    const emailid = req.query.emailid;
    if (!emailid) {
      return resp.status(400).json({ status: false, message: "Email ID is required" });
    }

    const vendor = await Vendor.findOne({ emailid: emailid.trim().toLowerCase() });
    if (!vendor) {
      return resp.status(404).json({ status: false, message: "No vendor found with this Email ID" });
    }

    resp.json({ status: true, vendor: vendor });
  } catch (err) {
    resp.status(500).json({ status: false, message: err.message });
  }
});

// 2. REGISTER VENDOR: POST /vendor/register
router.post("/register", async function (req, resp) {
  try {
    const {
      emailid,
      name,
      contact,
      business,
      area,
      address,
      city,
      estd,
      selcate,
      website,
      insta,
    } = req.body;
    console.log("Content-Type:", req.headers["content-type"]);
    console.log("Received body:", req.body);
    console.log("Received files:", req.files);

    if (!emailid || !name || !contact || !business) {
      return resp.status(400).json({
        status: false,
        message: "Email ID, Name, Contact, and Business Name are required",
      });
    }

    const existing = await Vendor.findOne({ emailid: emailid.trim().toLowerCase() });
    if (existing) {
      return resp.status(400).json({
        status: false,
        message: "Vendor with this Email ID is already registered",
      });
    }

    let shoppicurl = "";
    let certpicurl = "";

    // express-fileupload attaches files to req.files
    if (req.files && req.files.shoppic) {
      shoppicurl = await saveLocalFile(req.files.shoppic, "shoppic");
    }
    if (req.files && req.files.certpic) {
      certpicurl = await saveLocalFile(req.files.certpic, "certpic");
    }

    const newVendor = new Vendor({
      emailid: emailid.trim().toLowerCase(),
      name,
      contact,
      business,
      area: area || "",
      address: address || "",
      city: city || "",
      estd: estd || "",
      selcate: selcate || "",
      website: website || "",
      insta: insta || "",
      shoppicurl,
      certpicurl,
    });

    await newVendor.save();
    resp.json({ status: true, message: "Vendor Registered Successfully", vendor: newVendor });
  } catch (err) {
    console.error("Register Error:", err);
    resp.status(500).json({ status: false, message: err.message });
  }
});

// 3. UPDATE VENDOR: POST & PUT /vendor/update
const handleUpdate = async (req, resp) => {
  try {
    const emailid = req.body.emailid || req.query.emailid;
    if (!emailid) {
      return resp.status(400).json({ status: false, message: "Email ID is required to update" });
    }

    const vendor = await Vendor.findOne({ emailid: emailid.trim().toLowerCase() });
    if (!vendor) {
      return resp.status(404).json({ status: false, message: "Vendor not found" });
    }

    const fields = [
      "name",
      "contact",
      "business",
      "area",
      "address",
      "city",
      "estd",
      "selcate",
      "website",
      "insta",
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        vendor[field] = req.body[field];
      }
    });

    // Check if new images uploaded
    if (req.files && req.files.shoppic) {
      vendor.shoppicurl = await saveLocalFile(req.files.shoppic, "shoppic");
    }
    if (req.files && req.files.certpic) {
      vendor.certpicurl = await saveLocalFile(req.files.certpic, "certpic");
    }

    await vendor.save();
    resp.json({ status: true, message: "Vendor Updated Successfully", vendor: vendor });
  } catch (err) {
    console.error("Update Error:", err);
    resp.status(500).json({ status: false, message: err.message });
  }
};

router.post("/update", handleUpdate);
router.put("/update", handleUpdate);


// 5. EVENT DIRECTORY: vendors matching the selected event, city and optional service
router.get("/event-directory", async function (req, resp) {
  try {
    const { event, city, service } = req.query;

    const servicesByEvent = {
      "Birthday": ["Cake", "Decoration", "Music", "Anchor"],
      "Jagran": ["Bhajan Singer", "Sound System", "Stage Decoration", "Lighting"],
      "Marriage": ["Catering", "Decoration", "Photography", "Music"],
      "Mehndi": ["Mehndi Artist", "Decoration", "Music", "Makeup Artist"],
      "Bhog": ["Catering", "Tent", "Sound System", "Decoration"],
      "Farewell Party": ["DJ / Sound", "Decoration", "Photography", "Catering"],
    };

    if (event && !servicesByEvent[event]) {
      return resp.status(400).json({
        status: false,
        message: "Invalid event type",
      });
    }

    const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const filter = {};
    if (city) {
      filter.city = new RegExp("^" + escapeRegex(city.trim()) + "$", "i");
    }

    // Existing vendor records store categories in the selcate string field.
    const relevantServices = service
      ? [String(service)]
      : (event ? servicesByEvent[event] : []);

    if (relevantServices.length) {
      filter.selcate = new RegExp(
        relevantServices.map(escapeRegex).join("|"),
        "i"
      );
    }

    const vendors = await Vendor.find(filter).sort({ createdAt: -1 });
    return resp.json({ status: true, vendors });
  } catch (err) {
    console.error("Event directory error:", err);
    return resp.status(500).json({
      status: false,
      message: "Unable to fetch event vendors",
    });
  }
});

// 4. GET ALL VENDORS (Bonus helper)
router.get("/all", async function (req, resp) {
  try {
    const list = await Vendor.find().sort({ createdAt: -1 });
    resp.json({ status: true, vendors: list });
  } catch (err) {
    resp.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;

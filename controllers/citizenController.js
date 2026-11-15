const Citizen = require("../models/modelCitizen");
const Tesseract = require("tesseract.js");
const sharp = require("sharp");

// =====================================
// 1. IMAGE PREPROCESSING + OCR
// =====================================

async function readImage(image) {
  if (!image) {
    throw new Error("Please upload an image.");
  }

  const allowed = ["image/jpeg", "image/png", "image/webp"];

  if (!allowed.includes(image.mimetype)) {
    throw new Error("Upload JPG, PNG or WEBP image.");
  }

  if (image.size > 5 * 1024 * 1024) {
    throw new Error("Image must be below 5 MB.");
  }

  // Improve image quality for OCR
  const processedImage = await sharp(image.data)
    .rotate()
    .resize({
      width: 2200,
      withoutEnlargement: true,
    })
    .grayscale()
    .normalize()
    .sharpen()
    .png()
    .toBuffer();

  const worker = await Tesseract.createWorker("eng");

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: "6",
      preserve_interword_spaces: "1",
    });

    const result = await worker.recognize(processedImage);

    return result.data.text;
  } finally {
    await worker.terminate();
  }
}

// =====================================
// 2. CLEAN OCR LINES
// =====================================

function getLines(text) {
  return text
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 1);
}

// =====================================
// 3. FRONT SIDE OCR
// =====================================

exports.ocrFront = async (req, res) => {
  try {
    const text = await readImage(req.files?.image);

    console.log("========== FRONT OCR TEXT ==========");
    console.log(text);
    console.log("====================================");

    const lines = getLines(text);

    // Aadhaar number
    const numberMatch = text.match(/\b\d{4}[\s-]*\d{4}[\s-]*\d{4}\b/);

    const acardno = numberMatch ? numberMatch[0].replace(/\D/g, "") : "";

    // DOB extraction
    let dob = "";

    const dobLabel = text.match(
      /(?:DOB|D\.O\.B|Date\s*of\s*Birth|Birth)\s*[:\-]?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})/i,
    );

    if (dobLabel) {
      dob = dobLabel[1];
    } else {
      const dates = text.match(/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}\b/g);

      dob = dates?.[0] || "";
    }

    // Gender
    let gender = "";

    if (/\bFEMALE\b/i.test(text)) {
      gender = "Female";
    } else if (/\bTRANSGENDER\b/i.test(text)) {
      gender = "Transgender";
    } else if (/\bMALE\b/i.test(text)) {
      gender = "Male";
    }

    // Name extraction
    let name = "";

    const unwanted = [
      /government/i,
      /india/i,
      /unique/i,
      /identification/i,
      /authority/i,
      /aadhaar/i,
      /uidai/i,
      /dob/i,
      /date of birth/i,
      /male/i,
      /female/i,
      /transgender/i,
      /address/i,
      /www/i,
      /help/i,
      /enrolment/i,
      /enrollment/i,
      /year of birth/i,
      /download/i,
    ];

    const validName = (line) => {
      return (
        line.length >= 3 &&
        line.length <= 60 &&
        !/\d/.test(line) &&
        /^[A-Za-z .'-]+$/.test(line) &&
        !unwanted.some((pattern) => pattern.test(line))
      );
    };

    // Look for the DOB label/date position
    let dobIndex = lines.findIndex((line) =>
      /DOB|D\.O\.B|Date\s*of\s*Birth|Birth/i.test(line),
    );

    if (dobIndex === -1 && dob) {
      dobIndex = lines.findIndex((line) => line.includes(dob));
    }

    // Search lines immediately before DOB
    if (dobIndex > 0) {
      const candidates = lines
        .slice(Math.max(0, dobIndex - 5), dobIndex)
        .filter(validName);

      if (candidates.length) {
        name = candidates[candidates.length - 1];
      }
    }

    // Fallback: find first plausible name line
    if (!name) {
      const candidates = lines.filter(validName);
      name = candidates[0] || "";
    }

    res.status(200).json({
      message: "Front OCR completed. Please verify details.",
      fields: {
        acardno,
        name,
        dob,
        gender,
      },
    });
  } catch (error) {
    console.log("FRONT OCR ERROR:", error);

    res.status(400).json({
      message: error.message || "Front OCR failed.",
    });
  }
};

// =====================================
// 4. BACK SIDE OCR
// =====================================

exports.ocrBack = async (req, res) => {
  try {
    const text = await readImage(req.files?.image);

    console.log("========== BACK OCR TEXT ==========");
    console.log(text);
    console.log("===================================");

    const lines = getLines(text);

    // Find address heading
    let addressIndex = lines.findIndex((line) => /address/i.test(line));

    // Some cards may have a To: heading
    if (addressIndex === -1) {
      addressIndex = lines.findIndex((line) => /^to\s*[:\-]?$/i.test(line));
    }

    let addressLines = [];

    if (addressIndex !== -1) {
      // Include text after address heading
      const headingText = lines[addressIndex]
        .replace(/.*address\s*[:\-]?/i, "")
        .trim();

      if (headingText) {
        addressLines.push(headingText);
      }

      addressLines.push(...lines.slice(addressIndex + 1));
    } else {
      // Fallback: retain readable address-like lines
      addressLines = lines.filter(
        (line) =>
          !/government|india|aadhaar|uidai|www\.|help@uidai|1800/i.test(line),
      );
    }

    // Remove footer and irrelevant lines
    addressLines = addressLines.filter(
      (line) =>
        !/www\.uidai|help@uidai|1800|downloaded|unique identification authority/i.test(
          line,
        ),
    );

    // Stop after PIN code if it is detected
    const pinIndex = addressLines.findIndex((line) => /\b\d{6}\b/.test(line));

    if (pinIndex !== -1) {
      addressLines = addressLines.slice(0, pinIndex + 1);
    }

    const address = addressLines.join(", ");

    // City / District extraction
    let city = "";

    const cityMatch = address.match(
      /(?:district|dist\.?|city|town)\s*[:\-]?\s*([A-Za-z][A-Za-z .'-]{1,40})/i,
    );

    if (cityMatch) {
      city = cityMatch[1].trim();
    } else {
      // Try lines immediately before PIN
      const usefulLines = addressLines.filter(
        (line) =>
          !/\d{6}/.test(line) && !/state|india|s\/o|d\/o|w\/o|c\/o/i.test(line),
      );

      if (usefulLines.length > 0) {
        const lastLine = usefulLines[usefulLines.length - 1];

        const parts = lastLine
          .split(/[,:-]/)
          .map((part) => part.trim())
          .filter(Boolean);

        city = parts[parts.length - 1] || "";
      }
    }

    res.status(200).json({
      message: "Back OCR completed. Please verify address.",
      fields: {
        address,
        city,
      },
    });
  } catch (error) {
    console.log("BACK OCR ERROR:", error);

    res.status(400).json({
      message: error.message || "Back OCR failed.",
    });
  }
};

// =====================================
// 5. SAVE CITIZEN
// =====================================

exports.saveCitizen = async (req, res) => {
  try {
    const data = req.body;

    if (!data.emailid?.trim()) {
      return res.status(400).json({
        message: "Email ID is required.",
      });
    }

    const emailid = data.emailid.trim().toLowerCase();

    const existing = await Citizen.findOne({ emailid });

    if (existing) {
      return res.status(409).json({
        message: "Citizen already exists.",
      });
    }

    const citizen = await Citizen.create({
      ...data,
      emailid,
    });

    res.status(201).json({
      message: "Citizen saved successfully.",
      citizen,
    });
  } catch (error) {
    console.log("SAVE ERROR:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// =====================================
// 6. FETCH CITIZEN
// =====================================

exports.fetchCitizen = async (req, res) => {
  try {
    const emailid = req.params.emailid.trim().toLowerCase();

    const citizen = await Citizen.findOne({ emailid });

    if (!citizen) {
      return res.status(404).json({
        message: "Citizen not found.",
      });
    }

    res.status(200).json({
      message: "Citizen found.",
      citizen,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// =====================================
// 7. UPDATE CITIZEN
// =====================================

exports.updateCitizen = async (req, res) => {
  try {
    const citizen = await Citizen.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!citizen) {
      return res.status(404).json({
        message: "Citizen not found.",
      });
    }

    res.status(200).json({
      message: "Citizen updated successfully.",
      citizen,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

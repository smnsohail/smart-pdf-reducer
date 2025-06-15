const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use('/output', express.static(path.join(__dirname, 'output')));

// Create folders if they don't exist
['uploads', 'output'].forEach(folder => {
  if (!fs.existsSync(folder)) fs.mkdirSync(folder);
});

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + '.jpg'),
});

const upload = multer({ storage });

app.post('/upload', upload.single('image'), async (req, res) => {
  const targetKB = parseInt(req.body.sizeLimit);
  const inputPath = req.file.path;
  const outputPath = `output/${Date.now()}.pdf`;

  try {
    // Resize and compress image with sharp
    let quality = 80;
    let compressedImagePath = inputPath.replace('.jpg', '-compressed.jpg');

    await sharp(inputPath)
      .jpeg({ quality })
      .toFile(compressedImagePath);

    // Create PDF from image
    const pdfDoc = await PDFDocument.create();
    const imgBytes = fs.readFileSync(compressedImagePath);
    const jpgImage = await pdfDoc.embedJpg(imgBytes);
    const page = pdfDoc.addPage([jpgImage.width, jpgImage.height]);
    page.drawImage(jpgImage, {
      x: 0,
      y: 0,
      width: jpgImage.width,
      height: jpgImage.height,
    });

    let pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);

    // Try reducing until it fits under size limit
    while (pdfBytes.length / 1024 > targetKB && quality > 20) {
      quality -= 10;
      await sharp(inputPath)
        .jpeg({ quality })
        .toFile(compressedImagePath);

      const updatedBytes = fs.readFileSync(compressedImagePath);
      const newPdf = await PDFDocument.create();
      const newJpg = await newPdf.embedJpg(updatedBytes);
      const page = newPdf.addPage([newJpg.width, newJpg.height]);
      page.drawImage(newJpg, {
        x: 0,
        y: 0,
        width: newJpg.width,
        height: newJpg.height,
      });

      pdfBytes = await newPdf.save();
      fs.writeFileSync(outputPath, pdfBytes);
    }

    fs.unlinkSync(inputPath); // cleanup
    fs.unlinkSync(compressedImagePath);

    res.json({ downloadUrl: `/${outputPath}` });
  } catch (err) {
    console.error(err);
    res.status(500).send('Conversion failed.');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

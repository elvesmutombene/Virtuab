
import { Storage } from "megajs";
import multer from "multer";

export const config = {
  api: {
    bodyParser: false
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024
  }
}).single("file");

function parseUpload(req, res) {
  return new Promise((resolve, reject) => {
    upload(req, res, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Método não permitido."
    });
  }

  if (
    !process.env.TEST_ACCESS_KEY ||
    req.headers["x-test-key"] !== process.env.TEST_ACCESS_KEY
  ) {
    return res.status(401).json({
      success: false,
      message: "Acesso não autorizado."
    });
  }

  try {
    await parseUpload(req, res);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Seleciona um ficheiro."
      });
    }

    const file = req.file;

    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowed.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Formato não permitido."
      });
    }

    const storage = await new Storage({
      email: process.env.MEGA_EMAIL,
      password: process.env.MEGA_PASSWORD
    }).ready;

    let folder = storage.root.children.find(
      item =>
        item.name === "INFROPAY_TEST" &&
        item.directory
    );

    if (!folder) {
      folder = await storage.root.mkdir("INFROPAY_TEST");
    }

    const uploaded = await folder.upload({
      name: file.originalname,
      size: file.size
    }, file.buffer).complete;

    const link = await uploaded.link();

    return res.status(200).json({
      success: true,
      message: "Ficheiro enviado para o MEGA!",
      filename: uploaded.name,
      size: uploaded.size,
      link
    });

  } catch (error) {
    console.error("Erro no upload:", error);

    return res.status(500).json({
      success: false,
      message: "Não foi possível enviar o ficheiro.",
      error: error.message
    });
  }
}


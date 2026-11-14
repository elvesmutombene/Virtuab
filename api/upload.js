
import { Storage } from "megajs";
import multer from "multer";
import admin from "firebase-admin";
import crypto from "node:crypto";

export const config = {
    api: {
        bodyParser: false
    }
};

/* FIREBASE ADMIN */

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
        })
    });
}

const db = admin.firestore();

/* UPLOAD TEMPORÁRIO */

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 3 * 1024 * 1024,
        files: 1
    }
}).single("file");

function parseUpload(req, res) {
    return new Promise((resolve, reject) => {
        upload(req, res, error => {
            if (error) reject(error);
            else resolve();
        });
    });
}

/* FORMATOS PERMITIDOS */

const allowedTypes = {
    image: [
        "image/jpeg",
        "image/png",
        "image/webp"
    ],
    pdf: [
        "application/pdf"
    ]
};

/* VALIDAR CONTEÚDO REAL */

function validateFile(buffer, kind) {
    const header = buffer.subarray(0, 12);

    if (kind === "pdf") {
        return header.subarray(0, 5).toString() === "%PDF-";
    }

    const jpeg =
        header[0] === 0xFF &&
        header[1] === 0xD8 &&
        header[2] === 0xFF;

    const png = header
        .subarray(0, 8)
        .equals(Buffer.from([
            137, 80, 78, 71, 13, 10, 26, 10
        ]));

    const webp =
        header.subarray(0, 4).toString() === "RIFF" &&
        header.subarray(8, 12).toString() === "WEBP";

    return jpeg || png || webp;
}

/* LIGAÇÃO AO MEGA */

let megaStoragePromise;

async function getMegaStorage() {
    if (!process.env.MEGA_EMAIL || !process.env.MEGA_PASSWORD) {
        throw new Error("Configuração MEGA ausente.");
    }

    if (!megaStoragePromise) {
        megaStoragePromise = new Storage({
            email: process.env.MEGA_EMAIL,
            password: process.env.MEGA_PASSWORD
        }).ready.catch(error => {
            megaStoragePromise = null;
            throw error;
        });
    }

    return megaStoragePromise;
}

/* ENCONTRAR OU CRIAR PASTA */

async function getUserFolder(storage, uid) {
    let rootFolder = storage.root.children.find(
        item => item.name === "LOWTICKETPAY" && item.directory
    );

    if (!rootFolder) {
        rootFolder = await storage.root.mkdir("LOWTICKETPAY");
    }

    let userFolder = rootFolder.children.find(
        item => item.name === uid && item.directory
    );

    if (!userFolder) {
        userFolder = await rootFolder.mkdir(uid);
    }

    return userFolder;
}

/* ENDPOINT */

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            message: "Método não permitido."
        });
    }

    try {

        /* AUTENTICAÇÃO */

        const authorization = req.headers.authorization || "";

        if (!authorization.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Sessão não autorizada."
            });
        }

        const token = authorization.slice(7);

        const decoded = await admin.auth().verifyIdToken(token);

        /* RECEBER FICHEIRO */

        await parseUpload(req, res);

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Seleciona um ficheiro."
            });
        }

        const file = req.file;
        const kind = req.body.kind;

        /* VALIDAR TIPO */

        if (!allowedTypes[kind]?.includes(file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: "Formato de ficheiro não permitido."
            });
        }

        if (!validateFile(file.buffer, kind)) {
            return res.status(400).json({
                success: false,
                message: "O conteúdo do ficheiro é inválido."
            });
        }

        /* CONECTAR AO MEGA */

        const storage = await getMegaStorage();

        const userFolder = await getUserFolder(
            storage,
            decoded.uid
        );

        /* NOME INTERNO */

        const fileId = crypto.randomUUID();

        const extension =
            kind === "pdf"
                ? ".pdf"
                : file.mimetype === "image/png"
                    ? ".png"
                    : file.mimetype === "image/webp"
                        ? ".webp"
                        : ".jpg";

        const filename = fileId + extension;

        /* ENVIAR PARA MEGA */

        const uploaded = await userFolder.upload(
            {
                name: filename,
                size: file.size
            },
            file.buffer
        ).complete;

        /* REGISTAR NO FIRESTORE */

        await db.collection("privateUploads").doc(fileId).set({
            fileId,
            ownerId: decoded.uid,
            kind,
            megaNodeId: uploaded.nodeId,
            filename,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        /* RESPOSTA SEM LINK */

        return res.status(200).json({
            success: true,
            fileId
        });

    } catch (error) {

        console.error("Erro no upload:", error);

        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
                success: false,
                message: "O ficheiro ultrapassa o limite de 3 MB."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Não foi possível enviar o ficheiro."
        });
    }
}

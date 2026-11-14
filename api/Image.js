
import { Storage } from "megajs";
import admin from "firebase-admin";

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

/* CONEXÃO MEGA */

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

/* LOCALIZAR FICHEIRO */

function findMegaFile(storage, nodeId) {
    const pending = [...storage.root.children];

    while (pending.length) {
        const item = pending.shift();

        if (item.nodeId === nodeId) {
            return item;
        }

        if (item.directory && item.children) {
            pending.push(...item.children);
        }
    }

    return null;
}

/* ENDPOINT */

export default async function handler(req, res) {

    if (req.method !== "GET") {
        return res.status(405).json({
            success: false,
            message: "Método não permitido."
        });
    }

    try {

        const fileId = req.query.fileId;

        if (
            typeof fileId !== "string" ||
            !/^[0-9a-f-]{36}$/i.test(fileId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Identificador inválido."
            });
        }

        /* CONSULTAR FIRESTORE */

        const doc = await db
            .collection("privateUploads")
            .doc(fileId)
            .get();

        if (!doc.exists) {
            return res.status(404).end();
        }

        const fileData = doc.data();

        if (fileData.kind !== "image" || !fileData.megaNodeId) {
            return res.status(404).end();
        }

        /* LIGAR AO MEGA */

        const storage = await getMegaStorage();

        const megaFile = findMegaFile(
            storage,
            fileData.megaNodeId
        );

        if (!megaFile) {
            return res.status(404).end();
        }

        /* DESCARREGAR IMAGEM */

        const buffer = await megaFile.downloadBuffer();

        const extension = fileData.filename.split(".").pop().toLowerCase();

        const mimeTypes = {
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            png: "image/png",
            webp: "image/webp"
        };

        const contentType = mimeTypes[extension];

        if (!contentType) {
            return res.status(415).end();
        }

        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Length", buffer.length);
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.setHeader("X-Content-Type-Options", "nosniff");

        return res.status(200).send(buffer);

    } catch (error) {

        console.error("Erro ao carregar imagem:", error);

        return res.status(500).end();
    }
}

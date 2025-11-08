const multer = require('multer');
const path = require('path');


//metodo de almacenamiento de archivos para empleados que suben imagenes
const diskStorageUsuarios = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../../public/img/usuarios"));
    },

    filename: (req, file, cb) => {
        if (
            file.mimetype == "image/jpeg" ||
            file.mimetype == "image/png" ||
            file.mimetype == "image/jpg"
        ) {
            const uniqueSuffix = Math.round(Math.random() * (99999 - 10000)) + 10000;

            cb(
                null,
                "empleados-" +
                Date.now() +
                uniqueSuffix +
                "-" +
                file.mimetype.replace("/", ".")
            );
        }
    },
});

//configuracion de subida de imagenes para usuarios
exports.uploadImagenUsuarios = multer({
    storage: diskStorageUsuarios,
    fileFilter: (req, file, cb) => {

        if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
            cb(null, true);
        } else {
            cb(null, false);
            return cb(new Error("Solo archivos png, jpeg o jpg"));
        }
    },
    limits: {
        fileSize: 5000000, // 5MB
    },
}).single("imagen");
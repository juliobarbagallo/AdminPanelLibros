var express = require('express');
const nunjucks = require('nunjucks');
const sha256 = require('sha256')
var bodyParser = require('body-parser')
require('dotenv').config()
var	app = express();
session = require('express-session');
app.use(session({
    secret: process.env.key || 'string-supersecreto-nunca-visto-jamas-jamas',
    name: 'sessionId',
    proxy: true,
    resave: true,
    saveUninitialized: true ,
    cookie: { maxAge: 24 * 60 * 60 * 1000  }  
}));  

const path = require('path');
app.use('/public', express.static(path.join(__dirname + '/public')));

nunjucks.configure(path.join(__dirname + '/views/'), {
    autoescape: false,
    express: app
});

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const MongoClient = require('mongodb').MongoClient;

// Le asignamos a MONGO_URL la url que está en las variales de entorno en el .env
const MONGO_URL = process.env.MONGO_URL;


//Index
app.get("/", (req, res) => {
    res.render('index.html',{logeado:req.session.login, admin:req.session.admin});
});

app.all('/login', function (req, res) {
    if (!req.body.usuario || !req.body.contrasenia) {
        res.send('No se ha podido hacer el login');    
} 
else {

    MongoClient.connect(MONGO_URL,{ useUnifiedTopology: true }, (err, db) => {  
        const dbo = db.db("restapi");  
        // console.log(sha256(req.body.contrasenia))
        dbo.collection("usuarios").findOne({$and:[{"nombre_usuario":req.body.usuario},{"contrasenia":(sha256(req.body.contrasenia)).toUpperCase }]},function(err, usuario) {             
            // console.log(usuario); 
            if(usuario){
                req.session.login = true;  
                req.session.nombre = usuario.nombre_usuario;
                req.session.admin = usuario.admin;
                console.log(req.session.admin)
                res.render('index.html',{logeado:req.session.login, admin:req.session.admin, usuario:req.session.nombre});
            }
            else{
                res.status(401).send("No has sido autorizado, amigo.");
            } 
        })
    });
}
    
});


app.all('/agregalibro', function (req, res) {
    if(req.session.login && req.session.admin){
    
        MongoClient.connect(MONGO_URL,{ useUnifiedTopology: true }, (err, db) => {  
            const dbo = db.db('restapi');  
        
            dbo.collection("libros").insertOne(
                {
                    title: req.body.title,
                    isbn: req.body.isbn, 
                    pageCount: parseInt(req.body.pageCount),
                    language: req.body.language,
                    publishDate: req.body.publishDate,
                    thumbnailUrl: req.body.thumbnailUrl,
                    description: req.body.description,
                    pais: req.body.pais,
                    editorial: req.body.editorial
                },
                function (err, res) {
                    db.close();
                    if (err) {              
                        return console.log(err);    
                    }
                })
                res.render('agregado.html',{mensaje:"Alta exitosa de "+req.body.title});
                
            });
        }
    
    else{
    res.render('add.html',{});};
    
    });


app.get('/logout', function (req, res) {
    req.session.destroy();
    res.render('index.html')
});

app.all('/add', function (req, res) {
if(req.body.plato && req.body.descripcion && req.body.categoria && req.body.precio){

    MongoClient.connect(MONGO_URL,{ useUnifiedTopology: true }, (err, db) => {  
        const dbo = db.db('menu');  
        var i = 0;
        dbo.collection('platos').find().forEach((datos) => {   		
            i++;
        }, ()=>{
            dbo.collection("platos").insertOne(
                {
                id:i,
                plato: req.body.plato,
                descripcion: req.body.descripcion, 
                precio: parseInt(req.body.precio),
                IDcategoría: parseInt(req.body.categoria)
                },
                function (err, res) {
                    db.close();
                    if (err) {              
                        return console.log(err);    
                    }
                })
                res.render('add.html',{mensaje:"Alta exitosa de "+req.body.plato});
            });
        });
    }

else{
res.render('add.html',{});};

});

app.listen(8080);
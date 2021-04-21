const express=require("express");
const app=express();
const {pool} = require("./dbConfig");
const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");
const Session  = require("express-session");
const passport = require("passport");
require("dotenv").config();
const initializePassport = require("./passportConfig");
const path = require('path');
const bodyParser = require('body-parser');
const Pusher = require('pusher');
const fileUpload = require('express-fileupload');
const { title } = require("process");

initializePassport(passport);




const PORT=process.env.PORT || 4000;


app.use(express.static('public'))
app.use('/css', express.static(__dirname + 'public/css'))
app.use('/js', express.static(__dirname + 'public/js'))
app.use('/image', express.static(__dirname + 'public/image'))

app.use(express.json());

app.use('/upload',express.static('upload/'));


app.set("view engine","ejs");
app.use(express.urlencoded({extended:false}));
app.use(fileUpload());

app.use(session({
    secret:"secret",
    
    resave:false,

    saveUninitialized:false

    })
);
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.get("/index",(req,res)  => {
    res.render("index");
});

app.post("/index",(req,res)  => {
    res.render("index");
});






app.get("/users/register", checkAuthenticated , (req,res)=>{
   res.render("register"); 
});





app.get("/users/login", checkAuthenticated, (req,res)=>{
    res.render("login"); 
 });

 app.get("/users/dashboard", checkNotAuthenticated, (req,res)=>{
    res.render("dashboard",{user: req.user.name}); 
 });

 app.get("/user", (req, res) => {
    var user = {user: req.user.name};
    console.log("username",user);
});
 

 app.get("/users/sell", checkNotAuthenticated, (req,res)=>{
    res.render("sell"); 
 });

 app.get("/users/logout",(req,res)=>{
     req.logout();
     req.flash("success_msg","You have logged out");
     res.redirect("/users/login");

 });

 app.post("/users/register",async (req,res) => {
    let {name,email,password,password2}=req.body;
    console.log({
        name,
        email,
        password,
        password2
    });
let errors = [];

if(!name || !email || !password || !password2){
    errors.push({message:"Please Enter all fields"});
}

if(password.length<6){
    errors.push({message:"Password should be at least 6 characters"});
}

if(password!=password2){
    errors.push({message:"Passwords Don not match"});
}

if(errors.length>0)
res.render("register",{errors});
else{
    //form validation has passed
    let hashedPassword=await bcrypt.hash(password,10);
    console.log(hashedPassword);

    pool.query(
        `SELECT *FROM cust WHERE
        email=$1`,[email],
        (err,results)=>{
            if(err){
                throw err;
            }
            
            console.log(results.rows);

            if(results.rows.length>0){
                errors.push({message: "Email already exist"});
                res.render("register",{errors})
            }else{
                pool.query(
                    `insert into cust (name,email,password)
                    values ($1,$2,$3)
                    RETURNING id,password`,
                    [name,email,hashedPassword],
                    (err,results) => {
                        if(err){
                            throw err;
                        }
                        console.log(results.row);
                        req.flash("success_msg", "You are now registered. Please log in");
                        res.redirect("/users/login");
                    } 
                );
            }
        }
     );
}


   
 });


 app.post("/users/login",passport.authenticate("local", {
     successRedirect:'/users/dashboard',
     failureRedirect:'/users/login',
     failureFlash: true
 })
 );


 function checkAuthenticated(req,res,next){
     if(req.isAuthenticated()){
     return res.redirect("/users/dashboard");
     }
     next();
 }

 function checkNotAuthenticated(req,res,next){
     if(req.isAuthenticated()){
         return next()
     }
     res.redirect("/users/login")
 }

app.post("/users/sell", checkNotAuthenticated,(req, res) =>{

    const user = req.user;
    const  fuel =req.body.radio1;
    const transmission=req.body.radio2;
    const now=req.body.radio3;
    let sampleFile;
    let uploadPath;
    if(!req.files || Object.keys(req.files).length===0){
    return res.status(400).send('No files were uploaded.');
    }

  //name of the imput is sampleFile
  sampleFile = req.files.sampleFile;
  uploadPath = __dirname = 'upload/' + sampleFile.name;
  console.log(sampleFile);

    let {carname,year,addtitle,desc,sp,mn}=req.body;
  console.log(req.body.carname);

  sampleFile.mv(uploadPath,function(err){
    pool.query(
        `insert into car_details (id,car_name,year,fuel,transmission,no_of_owners,addtitle,description,price,mob_no,img)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [user.id,carname,year,fuel,transmission,now,addtitle,desc,sp,mn,sampleFile.name],
        function(error, results, fields) {
            if (error) throw error;
            console.log(results);
            //console.log(comments);
            console.log(error)
  
        });
    });
    });
    /*app.get("/bcar",(req,res)=>{
        res.render("bcar");
    })*/

  
    
    /*app.get("/bcar",(req,res)=>{
       pool.query(`SELECT
       name
   FROM
       cust
   INNER JOIN car_details ON cust.id = car_details.id`,function(err,data,fields){
       if(err){
           throw err;
       }else{
        res.render('bcar', {data:data});
       }
       console.log(data);
   });
  // res.redirect("/bcar");

    });*/


    app.get('/buycar', function(req, res, next) {
        pool.query(`SELECT
        name,email,password,car_name,img,year,price,no_of_owners,description,fuel,mob_no,date
        FROM
        cust
        INNER JOIN car_details ON cust.id = car_details.id`, function (err,data,rows) {
        if (err) throw err;
        res.render('buycar', {title:'User List', data: data.rows});
      });
    });



app.listen(PORT,()=>{
    console.log(`server running on port ${PORT}`);
});
const express=require("express");
const mongoose=require("mongoose");
const {nanoid}=require("nanoid");
const path=require("path");
const {setUser,getUser}=require("./user_id");
const app=express();
const PORT=8002;
const cookieparser=require("cookie-parser");
const jwt=require("jsonwebtoken");
const { decode } = require("punycode");
const secret="Parth@1234";

//ejs connection
app.set('view engine','ejs');
app.set('views',path.resolve("./views"));
app.use('/public',express.static('public'));

//connection
mongoose.connect("mongodb://127.0.0.1:27017/User-DB").
then(()=>console.log("MongoDB Connected!!"))
.catch(err=>console.log("Mongo Error:",err));
//schema
const userSchema=new mongoose.Schema({
    FullName:{
        type:String,
        required:true
    },
    Email:{
        type:String,
        unique:true,
        required:true
    },
    Password:{
        type:String,
        require:true
    }
})

//model User
const User=mongoose.model('user',userSchema);


const URLschema=new mongoose.Schema({
    ShortURL:{
        type:String,
        required:true
    },
    RedirectURL:{
        type:String,
        required:true
    },
    visitHistory:{
        type:Array,
        required:true
    },
    //email of user
    createdBy:{
        type:String,
        required:true
    }
})
//model URL
const URLData=mongoose.model('urls',URLschema);

//middlewares

app.use(express.urlencoded({extended:false}));
app.use(cookieparser());


//Default Page(Sign Up)
app.get("/",(req,res)=>{
    if (req.url.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
    }
    return res.render("../views/singup");
})


app.post("/",(req,res)=>{
   let body=req.body;
   if(!body.FullName|| !body.Email||!body.Password){
    res.render("../views/singup");
   }

   User.create({
    FullName:body.FullName,
    Email:body.Email,
    Password:body.Password
   }).then(()=>{
    
    return res.redirect("/login");
   }).catch((err)=>{
    console.log("Error:",err);
   })

})

//Login Page
app.get("/login",(req,res)=>{
    return res.render("../views/login");
})

app.post("/login",async (req,res)=>{
    let body=req.body;
    
    if(!body.Email|| !body.Password){
        return res.redirect("/login");
    }
    
    User.findOne({Email:body.Email,Password:body.Password})
    .then((user)=>{
        if(user){
            let token=setUser(user);
            res.cookie("ID",token,{maxAge:600000});
            return res.redirect("/mainpage");   
        }else{
            return res.redirect("/login");
        }
    })
    
})

//Main Page
app.get("/mainpage",async(req,res)=>{
    let id=req.cookies.ID;
    if(!id){
        return res.redirect("/login");
    }
    jwt.verify(id,secret,async (err,decoded)=>{
        if(err){
            console.log("Error:",err);
        }else{
            let user=await User.findOne({Email:decoded.Email});
            let databyuser=await URLData.find({createdBy:decoded.Email});
            return res.render("../views/mainpage",{urls:databyuser,username:user.FullName});
        }
    })
    
    
})

app.post("/mainpage",(req,res)=>{
    let body=req.body;
    if(!body.url){ 
        return res.redirect("/mainpage");
    }
    
    let id=req.cookies.ID;
    jwt.verify(id,secret,async (err,decoded)=>{
        if(err){
            console.log("Error:",err);
        }else{
            let urlshortid=nanoid(8);
            await URLData.create({
                ShortURL:urlshortid,
                RedirectURL:body.url,
                visitHistory:[],
                createdBy:decoded.Email
            }).then(async (user)=>{
                console.log("Short ID:",urlshortid);
                // let datatoshow=await URLData.find({createdBy:decoded.Email});
                return res.redirect("/mainpage");
            }).catch((err)=>{
                console.log("Error:",err);
            })

        }
    })
    
    
    

})

//visit History
app.get("/URL/:id",async(req,res)=>{
    let id=req.params.id;
    // let urldata=await URLData.findOne({ShortURL:id});
    // if(!urldata){
    //     return res.json({Error:"Page doesn't exists.."});
    // }
    // urldata.visitHistory.push(Date.now());
    // return res.redirect(urldata.RedirectURL);
    try {
        let urldata = await URLData.findOne({ ShortURL: id });
        if (!urldata) {
            return res.json({ Error: "Page doesn't exist." });
        }
        urldata.visitHistory.push(Date.now());
        await urldata.save(); // Save the document with updated visit history
        return res.redirect(urldata.RedirectURL);
    } catch (error) {
        console.error("Error:", error);
        return res.json({ Error: "An error occurred." });
    }
})

//logout
app.get("/logout",(req,res)=>{
    res.clearCookie('ID');
    res.redirect('/login');
})


app.listen(PORT,()=>{
    console.log("App is Listening at PORT:",PORT);
})
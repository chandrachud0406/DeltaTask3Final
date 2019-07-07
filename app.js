var express = require('express');
var app = express();
var session = require('express-session');
var connectFlash = require('connect-flash');
var fs = require('file-system');
var multer = require('multer');

//set up template engine
app.set('view engine',  'ejs');

//static files
app.use(express.static(__dirname));


var bodyParser = require('body-parser');
var mongoose = require('mongoose');

//Algorithm for hashing
var bcrypt = require('bcryptjs');
var saltRounds = 10;

//Imported Schemas
var User = require('./models/users');
var Form = require('./models/forms');
var Ques = require('./models/questions');

mongoose.Promise = global.Promise;

//Connect to database
mongoose.connect('mongodb://localhost/formsapp',  
{ useNewUrlParser: true , 
useCreateIndex:true,
useFindAndModify: false} );

console.log('Forms app server started');
var urlEncodedParser = bodyParser.urlencoded({extended: false});

//set up a session
app.use(session({
    secret: 'random-secret',
    resave: false,
    saveUninitialized: true,
}));

//Multer for file/image uploads
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/uploads')
    },
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now())
    }
});

var upload = multer({ storage: storage });  

//Flash messages
app.use(connectFlash());

//=====================================================
//Managing login/signup/logout system
//=====================================================

//Home page
app.get('/', function(req, res){
    res.render('home');
});

//Signup page
app.get('/signup', function(req, res){
    var availUsernames = [];
    User.find({}).exec().then(function(usernames){

        for(var i = 0; i < usernames.length; i++) {
            availUsernames.push(usernames[i].username);
        }
        res.render('signup', {message: req.flash('info'), users: availUsernames });
        
    }).catch(function(err){
        console.log(err);
    });

});

//Login page
app.get('/login', function(req, res){
    res.render('login', {message: req.flash('info')});
});

//Logout page
app.get('/logout', function(req, res){

    req.session.user = "";
    res.redirect('/');
});

//to Create a new user with hashed password
app.post('/signup', urlEncodedParser, function(req, res){
    //console.log(req.body);

    User.findOne({username: req.body.username}).exec().then(function(usercheck){

        if(usercheck === null) {
            var userPassword = req.body.password;
            bcrypt
                .genSalt(saltRounds)
                .then(salt => {
                //console.log(`Salt: ${salt}`);
            
                return bcrypt.hash(userPassword, salt);
                })
                .then(hash => {
                //console.log(`Hash: ${hash}`);
                req.session.redirectTo = '';
                //console.log(req.session);
                var newUser = new User({username: req.body.username, password:hash});
                newUser.save(function(err){
                    if (err) throw err;
                });
                })
                .catch(err => console.error(err.message));
                //createCustomTemplate(newUser._id);
                res.redirect('/login');
        }
        else {
            req.flash('info', 'username already exists');
            res.redirect('signup');
        }
    });
});


//Login verification
app.post('/login', urlEncodedParser, function(req, res){
  //  console.log(req.body);
    var loginUsername = req.body.username;
    var loginPassword = req.body.password;
    User.findOne({username: loginUsername}).exec().then(function(user){

        if(user !== null) {
            bcrypt
            .compare(loginPassword, user.password)
            .then(bool => {
                if(bool) {
                    var sess = req.session;
                    sess.user = user;
                    var redirectTo = req.session.redirectTo || '';
                    delete req.session.redirectTo;

                    //console.log(req.session);

                    if(redirectTo === '')
                        res.redirect('dashboard');

                    else
                        res.redirect(redirectTo)
                }
                else {
                    req.flash('info', 'Incorrect password');
                    res.redirect('login');
                }
            })
            .catch(err => console.error(err.message));
        }

        else{
            req.flash('info', "Username doesn't exist. Create new account here");
            res.redirect('/signup');
        }
    });

});

//Middleware to check whether the user has logged in
function isLoggedIn(req,res,next){
    if(req.session.user && req.session.user != "")
      next();
    else{
        console.log('error no login');
        res.redirect("/login");  
    }
}

//=================================================
//Dashboard to create/edit/delete forms
//=================================================

//Dashboard Page
app.get('/dashboard', isLoggedIn, function(req, res) {
    
    var sess = req.session;
    var currentUserID = sess.user._id;

    User.findById(currentUserID).populate("myForms").exec().then(function(user){

        console.log(user);
        res.render('dashboard', {user: user} );
        console.log('render dashboard');

    }).catch(function(err){
        if(err)
        console.log(err);
    })
});

//To explore trending forms sorted based on number of submissions
app.get('/form/explore', isLoggedIn, function(req, res){
    console.log('explored forms');
    
    Form.find({}).sort('-totalResponses').populate("questions").exec().then(function(allForms){
        console.log(allForms);
        res.render('exploreForms', {allForms:allForms});
    })
});

//Custom forms page
app.get('/form/custom', isLoggedIn, function(req, res){
    console.log('custom forms');

    res.render('customTemplate');
});

//To create custom forms of different types
app.get('/form/custom/create/:type', isLoggedIn, function(req,res) {
    console.log('created custom forms');
    var sess = req.session;
    var currentUserID = sess.user._id;

    console.log(req.params);
    if(req.params.type === '1'){
        console.log('1');
        User.findById(currentUserID).exec().then(function(user){

            Form.create({
                title: 'Tshirt Signup',
                desc: 'Fill details of shirt size'
    
                }).then(function(form) {
                        Ques.create({
                            question: 'What is your name?',
                            answerType: 'text',  
                            position: form.totalq
                        
                        }).then(function(ques1){
                            form.questions.push(ques1._id);
                            form.totalq += 1;
    
                        Ques.create({
                            question: 'What is your size?',
                            answerType: 'radio',  
                            position: form.totalq,
                            options:['S', 'M', 'L', 'XL']
    
                        }).then(function(ques2){
                            form.questions.push(ques2._id);
                            form.totalq += 1;
    
                        Ques.create({
                            question: 'Comments',
                            answerType: 'text',  
                            position: form.totalq
    
                        }).then(function(ques3){
                            form.questions.push(ques3._id);
                            form.totalq += 1;
    
                            form.save().then(function(){
                                user.myForms.push(form._id);
                                console.log(form);
                                
                                user.save().then(function(user){
                                    res.redirect('/form/edit/' + form._id)
                                });    
                            })
            
    
                        })
                        })
                        })       
            })
        }).catch(function(err) {
            console.log(err);
        });

    }
    if(req.params.type === '2') {
        User.findById(currentUserID).exec().then(function(user){

            Form.create({
                title: 'Event invitation',
                desc: 'Fill details to attend the event'
    
                }).then(function(form) {
                        Ques.create({
                            question: 'What is your name ?',
                            answerType: 'text',  
                            position: form.totalq
                        
                        }).then(function(ques1){
                            form.questions.push(ques1._id);
                            form.totalq += 1;
    
                        Ques.create({
                            question: 'How did you hear about this event ?',
                            answerType: 'radio',  
                            position: form.totalq,
                            options:['Friend', 'TV', 'News', 'Social media']
    
                        }).then(function(ques2){
                            form.questions.push(ques2._id);
                            form.totalq += 1;
    
                        Ques.create({
                            question: 'No of friends along with you',
                            answerType: 'number',  
                            position: form.totalq
    
                        }).then(function(ques3){
                            form.questions.push(ques3._id);
                            form.totalq += 1;
    
                            form.save().then(function(){
                                user.myForms.push(form._id);
                                console.log(form);
                                
                                user.save().then(function(user){
                                    res.redirect('/form/edit/' + form._id)
                                });    
                            })
            
    
                        })
                        })
                        })       
            })
        }).catch(function(err) {
            console.log(err);
        });

    }

    if(req.params.type === '3'){
        User.findById(currentUserID).exec().then(function(user){

            Form.create({
                title: 'Personal details',
                desc: 'Fill these details please'
    
                }).then(function(form) {
                        Ques.create({
                            question: 'What is your name?',
                            answerType: 'text',  
                            position: form.totalq
                        
                        }).then(function(ques1){
                            form.questions.push(ques1._id);
                            form.totalq += 1;
    
                        Ques.create({
                            question: 'Email',
                            answerType: 'text',  
                            position: form.totalq,
    
                        }).then(function(ques2){
                            form.questions.push(ques2._id);
                            form.totalq += 1;
    
                        Ques.create({
                            question: 'Address',
                            answerType: 'text',  
                            position: form.totalq
    
                        }).then(function(ques3){
                            form.questions.push(ques3._id);
                            form.totalq += 1;
    
                            form.save().then(function(){
                                user.myForms.push(form._id);
                                console.log(form);
                                
                                user.save().then(function(user){
                                    res.redirect('/form/edit/' + form._id)
                                });    
                            })
            
    
                        })
                        })
                        })       
            })
        }).catch(function(err) {
            console.log(err);
        });
    }
});

//Edit form page
app.get('/form/edit/:id', function(req, res){
    console.log('edited form');

    var sess = req.session;
    var currentUser = sess.user;

    Form.findById(req.params.id).populate("questions").exec().then(function(currentForm){
  //     console.log(currentForm);
       res.render('editforms', {form: currentForm});
    }).catch(function(err){
       console.log(err);
    })    

});

app.get('/form/share/:fid', function(req, res){
    console.log('share form');

    Form.findById(req.params.fid).exec().then(function(form){
        res.render('shareForm', {form:form});
    })
});

//delete form
app.get('/form/delete/:id', isLoggedIn, function(req, res){
    console.log("deleted form");
    
    var sess = req.session;
    var currentUser = sess.user;
    var currentUserID = currentUser._id;

    User.findById(currentUserID).exec().then(function(user){

        user.myForms.pull(req.params.id);

        Form.findByIdAndDelete(req.params.id, function(err){
            if(err)
            console.log(err);
        });
        user.save().then(function(){
            res.redirect('back');
        })
    }).catch(function(err){
        console.log(err);
    })
});

//create form and redirect to edit page
app.get('/form/create/', isLoggedIn, function(req, res){

    Form.create({title: "Form title", desc: "Form Desc",question:[]}).then(function(newForm){
        var currentUser = req.session.user;
        var currentUserID = currentUser._id;

        return User.findById(currentUserID).then(function(user){

            user.myForms.push(newForm._id);
            user.save().then(function(){

                res.redirect('/form/edit/' + newForm._id);
            })
        })
    }).catch(function(err){
        console.log(err);
    })
});

//====================================================
//Create/Delete/Save questions
//====================================================

//save form's question edits
app.post('/form/:fid/edit/save', urlEncodedParser, function(req, res){
    console.log('changes saved');
    
    if(req.body.expiry)
    var x =  new Date(req.body.expiry);
    
    Form.findById(req.params.fid).populate("questions").exec().then(async function(form){
        form.title = req.body.title;
        form.desc = req.body.desc;

        if(req.body.limit === 'on') {
            form.limitToOneResponse = true;
        }
        else if (req.body.limit !== 'on'){
            form.limitToOneResponse = false;
        }
        
        form.formatDate = req.body.expiry;
        form.expiryDate = x;

        var k = 0;
        for(let i = 1; i <= req.body.qn0.length; i++) {
            form.questions[i-1].question = req.body.qn0[i-1];

    
            if (Array.isArray(req.body.qn1) === false ){
                if(form.questions[i-1].answerType === "checkbox" || form.questions[i-1].answerType === "radio") {
                    if(form.questions[i-1].options.length === 0) {
                        form.questions[i-1].options.push(req.body.qn1);
                        form.questions[i-1].options.push(req.body.qn2);
                        form.questions[i-1].options.push(req.body.qn3);
                        form.questions[i-1].options.push(req.body.qn4);
                    }

                    if(form.questions[i-1].options.length !== 0) {
                        form.questions[i-1].options[0] = req.body.qn1;
                        form.questions[i-1].options[1] = req.body.qn2;
                        form.questions[i-1].options[2] = req.body.qn3;
                        form.questions[i-1].options[3] = req.body.qn4;
                    }

                }
            }

            else if(Array.isArray(req.body.qn1) === true ) {
                if(form.questions[i-1].answerType === "checkbox" || form.questions[i-1].answerType === "radio") {
                    if(form.questions[i-1].options.length === 0) {
                        form.questions[i-1].options.push(req.body.qn1[k]);
                        form.questions[i-1].options.push(req.body.qn2[k]);
                        form.questions[i-1].options.push(req.body.qn3[k]);
                        form.questions[i-1].options.push(req.body.qn4[k]);
                    }

                    if(form.questions[i-1].options.length !== 0) {
                        form.questions[i-1].options[0] = req.body.qn1[k];
                        form.questions[i-1].options[1] = req.body.qn2[k];
                        form.questions[i-1].options[2] = req.body.qn3[k];
                        form.questions[i-1].options[3] = req.body.qn4[k];
                        k++;
                    }
                }
            }
            await form.questions[i-1].save();
        }


        form.save().then(function(){
             console.log(form);
             res.redirect('/form/edit/'+ req.params.fid)
        }).catch(function(err){
            console.log(err);
        });

        
    });
});

//create new question
app.post('/form/question/create/:id', urlEncodedParser, isLoggedIn, function(req, res){
    console.log('created question');

    var sess = req.session;
    var currentUser = sess.user;
    //console.log(req.body.question);
    //console.log(req.params.pos);
    Form.findById(req.params.id).exec().then(function(form){
        //console.log(req.body);
        Ques.create({
            question: req.body.question,
            answerType: req.body.answerType,  
            position: form.totalq,
        }).then(function(ques){
            form.questions.push(ques._id);
            form.totalq += 1;

            if(ques.answerType === "radio" || ques.answerType === "checkbox"){
                form.mcqOptions.push(form.totalq - 1);
            }
            //console.log(ques);
            form.save().then(function(){
                res.redirect('/form/edit/' + req.params.id);
            })
        })
    }).catch(function(err)
    {
        console.log(err);
    });    
    
});

//delete question from form
app.get('/form/edit/:fid/question/delete/:qid', isLoggedIn, function(req, res){
    console.log("deleted question");
    
    var sess = req.session;
    var currentUser = sess.user;

    Form.findById(req.params.fid).exec().then(function(form){
        
        form.questions.pull(req.params.qid);
        
        Ques.findById(req.params.qid).exec().then(function(ques){
            form.mcqOptions = form.mcqOptions.filter(value => value != ques.position);
            form.save().then(function(){
                res.redirect('back');
            })
        })

/*      Ques.findByIdAndDelete(req.params.qid, function(err){
            if(err)
            console.log(err)
        });*/

    }).catch(function(err){

        console.log(err);
    })
});

//=====================================================
//Form response functions
//=====================================================

//Form response to be filled by other user 
app.get('/form/:fid/fill/response', function(req, res, next){
    if(!req.session.user) {
        //console.log(req.params);
        req.session.redirectTo = '/form/' + req.params.fid + '/fill/response';
        req.flash('info', 'Login first to fill the form');
        res.redirect('/login');
    }
    else {
        next();
    }
},
function(req, res){
    console.log('filled form');

    Form.findById(req.params.fid).populate("questions").exec().then(function(form){
        var currentDate = new Date();

        if(currentDate < form.expiryDate) {
            if(form.limitToOneResponse === true) {
                if(! form.filledUsers.includes(req.session.user.username)) {
                res.render('viewresponse', {form:form});
                }

                else {
                req.flash('info', 'Error! You can fill the form only once');
                res.redirect('/login');
                }
            }
            else if(form.limitToOneResponse === false) {
                res.render('viewresponse', {form:form});
            }
        }

        else {
            req.flash('info', 'Form expired!');
            res.redirect('/login');
        }
    }).catch(function(err){
        console.log(err);
    });

});

//To view responses
app.get('/form/:fid/useresponse', function(req, res){

    console.log('responses');
    Form.findById(req.params.fid).populate("questions").exec().then(function(form){

        for(var i = 0; i < form.questions.length; i++) {
            if(form.questions[i].answerType === "radio") {
                var option = [];

                option.push(form.questions[i].answer.filter(function(x){return x === form.questions[i].options[0]}).length);
                option.push(form.questions[i].answer.filter(function(x){return x === form.questions[i].options[1]}).length);
                option.push(form.questions[i].answer.filter(function(x){return x === form.questions[i].options[2]}).length);
                option.push(form.questions[i].answer.filter(function(x){return x === form.questions[i].options[3]}).length);
                
                //console.log(option);
                form.questions[i].optionCount = option;
                
            }
            else if(form.questions[i].answerType === "checkbox") {
                var option = [];
                
                var x = form.questions[i].answer[0].concat( form.questions[i].answer[1], form.questions[i].answer[2], form.questions[i].answer[3]);
                
                option.push(x.filter(function(x){return x === form.questions[i].options[0]}).length);
                option.push(x.filter(function(x){return x === form.questions[i].options[1]}).length);
                option.push(x.filter(function(x){return x === form.questions[i].options[2]}).length);
                option.push(x.filter(function(x){return x === form.questions[i].options[3]}).length);

                form.questions[i].optionCount = option;
            }
        }

        form.save().then(function(){
            res.render('useresponses', {form: form});
        })
    });

});

//submit response after filling form
app.post('/form/:fid/submit/response',upload.array('myFiles', 12) ,urlEncodedParser, isLoggedIn, function(req, res){
    console.log('submitted response');

    //console.log(req.files);
    //console.log(req.body);

    Form.findById(req.params.fid).populate("questions").exec().then(async function(form) {
        
        var k = 0;
        for(let i = 0; i < form.questions.length; i++) {
            var index = "an" + form.questions[i].position;
            form.questions[i].answer.push(req.body[index]);

            if(form.questions[i].answerType === 'file'){
                var finalFile = {
                    contentType: req.files[k].mimetype,
                    pos: form.questions[i].position,
                    url: req.files[k].path
                };
                
                form.questions[i].files.push(finalFile);
                k = k + 1;
            }

            await form.questions[i].save();
        }
        form.filledUsers.push(req.session.user.username);
        form.totalResponses = form.filledUsers.length;

        form.save().then(function(){
            req.session.user = "";
            req.flash('info', 'Form successfully filled');
            res.redirect('/login');
        });        
    });
});


//listen to port
app.listen(3000);
console.log('listening to 3000');
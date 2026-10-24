const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database(process.env.DB_FILE || path.join(__dirname, "careconnect.db"));
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

db.exec(`
CREATE TABLE IF NOT EXISTS appointments (
 id INTEGER PRIMARY KEY AUTOINCREMENT, patient TEXT NOT NULL, department TEXT NOT NULL,
 doctor TEXT NOT NULL, hospital TEXT NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'Booked', created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS care_notes (
 id INTEGER PRIMARY KEY AUTOINCREMENT, patient TEXT NOT NULL, concern TEXT NOT NULL,
 department TEXT NOT NULL, guidance TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS records (
 id INTEGER PRIMARY KEY AUTOINCREMENT, patient TEXT NOT NULL, type TEXT NOT NULL,
 title TEXT NOT NULL, details TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS referrals (
 id INTEGER PRIMARY KEY AUTOINCREMENT, patient TEXT NOT NULL, from_doctor TEXT NOT NULL,
 to_department TEXT NOT NULL, note TEXT DEFAULT '', status TEXT DEFAULT 'Pending',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS medicines (
 id INTEGER PRIMARY KEY AUTOINCREMENT, patient TEXT NOT NULL, name TEXT NOT NULL,
 instructions TEXT DEFAULT '', reminder TEXT DEFAULT '', status TEXT DEFAULT 'Active'
);
CREATE TABLE IF NOT EXISTS bills (
 id INTEGER PRIMARY KEY AUTOINCREMENT, patient TEXT NOT NULL, description TEXT NOT NULL,
 amount REAL NOT NULL, status TEXT DEFAULT 'Unpaid', created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS profiles (
 patient TEXT PRIMARY KEY, email TEXT DEFAULT '', phone TEXT DEFAULT '', emergency_contact TEXT DEFAULT '',
 consent INTEGER DEFAULT 0
);
`);

const doctors = [
 {name:"Dr. Ananya Sharma", dept:"General Medicine", hospital:"CityCare Hospital", experience:"8 years"},
 {name:"Dr. Rahul Deshmukh", dept:"Cardiology", hospital:"CityCare Hospital", experience:"12 years"},
 {name:"Dr. Meera Kulkarni", dept:"Dermatology", hospital:"WellSpring Clinic", experience:"7 years"},
 {name:"Dr. Arjun Patil", dept:"Orthopedics", hospital:"CityCare Hospital", experience:"10 years"},
 {name:"Dr. Sana Khan", dept:"Pediatrics", hospital:"LittleSteps Hospital", experience:"9 years"},
 {name:"Dr. Neha Joshi", dept:"ENT", hospital:"WellSpring Clinic", experience:"6 years"}
];
const patient = (req) => String(req.body.patient || req.query.patient || "Deepak Jadhav").trim().slice(0,100);
app.get("/api/health", (req,res)=>res.json({ok:true, app:"CARECONNECT API", database:"SQLite connected"}));
app.get("/api/doctors", (req,res)=>res.json(doctors));
app.get("/api/appointments", (req,res)=>{
 const p=patient(req); res.json(db.prepare("SELECT * FROM appointments WHERE patient=? ORDER BY id DESC").all(p));
});
app.post("/api/appointments", (req,res)=>{
 const p=patient(req), {department,doctor,hospital,date,time}=req.body;
 if(!department||!doctor||!hospital||!date||!time) return res.status(400).json({error:"Please complete all appointment fields."});
 const info=db.prepare("INSERT INTO appointments(patient,department,doctor,hospital,date,time) VALUES(?,?,?,?,?,?)").run(p,department,doctor,hospital,date,time);
 res.status(201).json(db.prepare("SELECT * FROM appointments WHERE id=?").get(info.lastInsertRowid));
});
app.patch("/api/appointments/:id", (req,res)=>{
 const p=patient(req); const result=db.prepare("UPDATE appointments SET status='Cancelled' WHERE id=? AND patient=?").run(req.params.id,p);
 if(!result.changes) return res.status(404).json({error:"Appointment not found."}); res.json({ok:true});
});
app.get("/api/queue", (req,res)=>{
 const p=patient(req);
 const latest=db.prepare("SELECT * FROM appointments WHERE patient=? AND status='Booked' ORDER BY id DESC LIMIT 1").get(p);
 res.json({token:latest ? 24 + latest.id : 24, ahead:latest ? Math.max(1,latest.id%7) : 3, doctor:latest?.doctor || "Dr. Ananya Sharma", hospital:latest?.hospital || "CityCare Hospital", status:latest ? "Booked — demo queue" : "Demo queue"});
});
app.post("/api/navigator", (req,res)=>{
 const p=patient(req), concern=String(req.body.concern||"").trim().slice(0,1000);
 if(!concern) return res.status(400).json({error:"Describe your concern first."});
 const s=concern.toLowerCase(); let department="General Medicine", guidance="A general clinician can help assess your concern and decide the next step.";
 if(/chest pain|heart|palpitation|heartbeat/.test(s)) {department="Cardiology";guidance="Consider discussing this with a cardiology clinician. New or severe chest pain, breathing difficulty, fainting, or cold sweating needs emergency care.";}
 else if(/skin|rash|itch|acne/.test(s)){department="Dermatology";guidance="A dermatology clinician may be appropriate for skin-related concerns.";}
 else if(/bone|joint|knee|back pain|fracture/.test(s)){department="Orthopedics";guidance="An orthopedics clinician may be appropriate for bone, joint, or injury concerns.";}
 else if(/child|baby|kid|pediatric/.test(s)){department="Pediatrics";guidance="A pediatric clinician may be appropriate for a child's concern.";}
 else if(/ear|nose|throat|hearing/.test(s)){department="ENT";guidance="An ENT clinician may be appropriate for ear, nose, or throat concerns.";}
 const safe=guidance+" This tool does not diagnose conditions or prescribe medicines. If symptoms are severe or rapidly worsening, seek urgent medical care.";
 db.prepare("INSERT INTO care_notes(patient,concern,department,guidance) VALUES(?,?,?,?)").run(p,concern,department,safe);
 res.json({department,guidance:safe,disclaimer:"Navigation support only — not a diagnosis or prescription."});
});
app.get("/api/notes",(req,res)=>res.json(db.prepare("SELECT * FROM care_notes WHERE patient=? ORDER BY id DESC").all(patient(req))));
app.get("/api/records",(req,res)=>res.json(db.prepare("SELECT * FROM records WHERE patient=? ORDER BY id DESC").all(patient(req))));
app.post("/api/records",(req,res)=>{
 const p=patient(req), {type,title,details}=req.body;
 if(!type||!title) return res.status(400).json({error:"Record type and title are required."});
 const info=db.prepare("INSERT INTO records(patient,type,title,details) VALUES(?,?,?,?)").run(p,type,title,String(details||""));
 res.status(201).json(db.prepare("SELECT * FROM records WHERE id=?").get(info.lastInsertRowid));
});
app.get("/api/referrals",(req,res)=>res.json(db.prepare("SELECT * FROM referrals WHERE patient=? ORDER BY id DESC").all(patient(req))));
app.post("/api/referrals",(req,res)=>{
 const p=patient(req), {from_doctor,to_department,note}=req.body;
 if(!from_doctor||!to_department) return res.status(400).json({error:"Enter referring clinician and destination department."});
 const info=db.prepare("INSERT INTO referrals(patient,from_doctor,to_department,note) VALUES(?,?,?,?)").run(p,from_doctor,to_department,String(note||""));
 res.status(201).json(db.prepare("SELECT * FROM referrals WHERE id=?").get(info.lastInsertRowid));
});
app.get("/api/medicines",(req,res)=>res.json(db.prepare("SELECT * FROM medicines WHERE patient=? ORDER BY id DESC").all(patient(req))));
app.post("/api/medicines",(req,res)=>{
 const p=patient(req), {name,instructions,reminder}=req.body;
 if(!name) return res.status(400).json({error:"Medicine name is required."});
 const info=db.prepare("INSERT INTO medicines(patient,name,instructions,reminder) VALUES(?,?,?,?)").run(p,name,String(instructions||""),String(reminder||""));
 res.status(201).json(db.prepare("SELECT * FROM medicines WHERE id=?").get(info.lastInsertRowid));
});
app.get("/api/bills",(req,res)=>res.json(db.prepare("SELECT * FROM bills WHERE patient=? ORDER BY id DESC").all(patient(req))));
app.post("/api/bills",(req,res)=>{
 const p=patient(req), {description,amount}=req.body;
 if(!description||!Number.isFinite(Number(amount))||Number(amount)<0) return res.status(400).json({error:"Enter a bill description and valid amount."});
 const info=db.prepare("INSERT INTO bills(patient,description,amount) VALUES(?,?,?)").run(p,description,Number(amount));
 res.status(201).json(db.prepare("SELECT * FROM bills WHERE id=?").get(info.lastInsertRowid));
});
app.patch("/api/bills/:id/pay",(req,res)=>{
 const result=db.prepare("UPDATE bills SET status='Paid' WHERE id=? AND patient=?").run(req.params.id,patient(req));
 if(!result.changes) return res.status(404).json({error:"Bill not found."}); res.json({ok:true});
});
app.get("/api/profile",(req,res)=>{
 const p=patient(req); let row=db.prepare("SELECT * FROM profiles WHERE patient=?").get(p);
 if(!row){db.prepare("INSERT INTO profiles(patient) VALUES(?)").run(p);row=db.prepare("SELECT * FROM profiles WHERE patient=?").get(p);}
 res.json(row);
});
app.put("/api/profile",(req,res)=>{
 const p=patient(req), {email,phone,emergency_contact,consent}=req.body;
 db.prepare("INSERT INTO profiles(patient,email,phone,emergency_contact,consent) VALUES(?,?,?,?,?) ON CONFLICT(patient) DO UPDATE SET email=excluded.email,phone=excluded.phone,emergency_contact=excluded.emergency_contact,consent=excluded.consent").run(p,String(email||""),String(phone||""),String(emergency_contact||""),consent?1:0);
 res.json(db.prepare("SELECT * FROM profiles WHERE patient=?").get(p));
});
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log(`CARECONNECT running on http://localhost:${PORT}`));

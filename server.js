const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3333;

app.use(express.json({ limit: '20mb' }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

['uploads', 'data'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Default data ──────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  defaultSecretary: "LEA LIEN A. PARREÑAS",
  defaultPastor: "REV. REYNANTE C. BILLONES",
  defaultCouncil: "BRO. KITCHIE VILLAMOR",
  churchName: "LIVING HOPE FOURSQUARE GOSPEL CHURCH",
  churchAddress: "Prk. Papaya, Mankilam, Tagum City, Davao del Norte",
  nationalHQ: "IF.Castillo Street, Project 4, Quezon City",
  districtOffice: "219 Bonifacio St., Tagum City, Davao del Norte",
  denomination: "CHURCH OF THE FOURSQUARE GOSPEL IN THE PHILIPPINES, INC."
};

// Baptismal — landscape, single page
const baptismalFields = [
  { id:"certTitle", label:"Certificate Title", type:"static", fieldType:"text",
    staticValue:"CERTIFICATE OF BAPTISM",
    x:29, y:5, width:67, align:"center", fontSize:36,
    fontFamily:"'Cinzel Decorative', serif", fontWeight:"bold", color:"#1565c0", letterSpacing:"3px" },
  { id:"recipientName", label:"Recipient Name", type:"dynamic", fieldType:"text",
    dataKey:"recipientName",
    x:8, y:17, width:84, align:"center", fontSize:54, minFontSize:20, autoSize:true,
    fontFamily:"'UnifrakturMaguntia', cursive", fontWeight:"normal", color:"#1a0a00" },
  { id:"baptismBody", label:"Body", type:"dynamic", fieldType:"paragraph",
    template:"Born at&ensp;<u><i>{{birthPlace}}</i></u>&ensp;on&ensp;<u><i>{{birthDate}}</i></u>. Upon profession of faith in the Lord Jesus Christ as personal Lord and Savior was by me baptized in water in the name of the Father, and of the&nbsp;Son, and of the Holy Ghost, on the&nbsp;<u><i>{{baptismDay}}</i></u>&nbsp;day of&ensp;<u><i>{{baptismMonth}}</i></u>&ensp;in the year of our Lord&nbsp;20&nbsp;<u>{{baptismYear}}</u>.",
    x:8, y:34, width:84, align:"justify", fontSize:15,
    fontFamily:"Georgia, 'Times New Roman', serif", color:"#1a1a1a", lineHeight:"1.9" },
  { id:"secretaryName", label:"Church Secretary Name", type:"dynamic", fieldType:"text",
    dataKey:"secretaryName", settingsKey:"defaultSecretary",
    x:5, y:63, width:33, align:"center", fontSize:13,
    fontFamily:"Arial, sans-serif", fontWeight:"bold", color:"#1a1a1a", borderBottom:true },
  { id:"secretaryLabel", label:"Secretary Label", type:"static", fieldType:"text",
    staticValue:"Signature of the Church Secretary",
    x:5, y:67, width:33, align:"center", fontSize:10,
    fontFamily:"Arial, sans-serif", color:"#444" },
  { id:"councilName", label:"Church Council Name", type:"dynamic", fieldType:"text",
    dataKey:"councilName", settingsKey:"defaultCouncil",
    x:5, y:72, width:33, align:"center", fontSize:13,
    fontFamily:"Arial, sans-serif", fontWeight:"bold", color:"#1a1a1a", borderBottom:true },
  { id:"councilLabel", label:"Council Label", type:"static", fieldType:"text",
    staticValue:"Church Council",
    x:5, y:76, width:33, align:"center", fontSize:10,
    fontFamily:"Arial, sans-serif", color:"#444" },
  { id:"pastorName", label:"Pastor/Minister Name", type:"dynamic", fieldType:"text",
    dataKey:"pastorName", settingsKey:"defaultPastor",
    x:52, y:61, width:43, align:"center", fontSize:13,
    fontFamily:"Arial, sans-serif", fontWeight:"bold", color:"#1a1a1a", borderBottom:true },
  { id:"pastorLabel", label:"Pastor Label", type:"static", fieldType:"text",
    staticValue:"Signature of Minister",
    x:52, y:65, width:43, align:"center", fontSize:10,
    fontFamily:"Arial, sans-serif", color:"#444" },
  { id:"churchName", label:"Church Name", type:"dynamic", fieldType:"text",
    dataKey:"churchName", settingsKey:"churchName",
    x:52, y:69, width:43, align:"center", fontSize:12,
    fontFamily:"Arial, sans-serif", fontWeight:"bold", color:"#1a1a1a", borderBottom:true },
  { id:"churchNameLabel", label:"Church Name Label", type:"static", fieldType:"text",
    staticValue:"Name of Church",
    x:52, y:73, width:43, align:"center", fontSize:10,
    fontFamily:"Arial, sans-serif", color:"#444" },
  { id:"churchAddress", label:"Church Address", type:"dynamic", fieldType:"text",
    dataKey:"churchAddress", settingsKey:"churchAddress",
    x:52, y:77, width:43, align:"center", fontSize:11,
    fontFamily:"Arial, sans-serif", color:"#1a1a1a", borderBottom:true },
  { id:"churchAddressLabel", label:"Church Address Label", type:"static", fieldType:"text",
    staticValue:"Address of Church",
    x:52, y:81, width:43, align:"center", fontSize:10,
    fontFamily:"Arial, sans-serif", color:"#444" },
  { id:"footerNatHQ", label:"National HQ", type:"dynamic", fieldType:"paragraph",
    template:"NATIONAL HEADQUARTERS\n{{nationalHQ}}",
    x:5, y:89, width:35, align:"left", fontSize:9,
    fontFamily:"Arial, sans-serif", color:"#555", lineHeight:"1.4" },
  { id:"footerDistrict", label:"District Office", type:"dynamic", fieldType:"paragraph",
    template:"NORTHCENTRAL MINDANAO DISTRICT OFFICE\n{{districtOffice}}",
    x:52, y:89, width:43, align:"left", fontSize:9,
    fontFamily:"Arial, sans-serif", color:"#555", lineHeight:"1.4" }
];

// Dedication — portrait, single page (includes sponsors)
const dedicationFields = [
  { id:"secretaryName", label:"Church Secretary Name", type:"dynamic", fieldType:"text",
    dataKey:"secretaryName", settingsKey:"defaultSecretary",
    x:5, y:53, width:38, align:"left", fontSize:13,
    fontFamily:"Arial, sans-serif", fontWeight:"bold", color:"#1a1a1a", borderBottom:true },
  { id:"secretaryLabel", label:"Secretary Label", type:"static", fieldType:"text",
    staticValue:"Signature of Church Secretary",
    x:5, y:57, width:38, align:"left", fontSize:10,
    fontFamily:"Arial, sans-serif", color:"#c62828" },
  { id:"councilName", label:"Church Council Name", type:"dynamic", fieldType:"text",
    dataKey:"councilName", settingsKey:"defaultCouncil",
    x:5, y:63, width:38, align:"left", fontSize:13,
    fontFamily:"Arial, sans-serif", fontWeight:"bold", color:"#1a1a1a", borderBottom:true },
  { id:"councilLabel", label:"Council Label", type:"static", fieldType:"text",
    staticValue:"Church Council",
    x:5, y:67, width:38, align:"left", fontSize:10,
    fontFamily:"Arial, sans-serif", color:"#c62828" },
  { id:"pastorName", label:"Pastor/Minister Name", type:"dynamic", fieldType:"text",
    dataKey:"pastorName", settingsKey:"defaultPastor",
    x:52, y:53, width:43, align:"left", fontSize:13,
    fontFamily:"Arial, sans-serif", fontWeight:"bold", color:"#1a1a1a", borderBottom:true },
  { id:"pastorLabel", label:"Pastor Label", type:"static", fieldType:"text",
    staticValue:"Signature of Minister",
    x:52, y:57, width:43, align:"left", fontSize:10,
    fontFamily:"Arial, sans-serif", color:"#c62828" },
  { id:"churchInfo", label:"Church Name & Address", type:"dynamic", fieldType:"paragraph",
    template:"{{churchName}}\n{{churchAddress}}",
    x:52, y:61, width:43, align:"left", fontSize:13,
    fontFamily:"Arial, sans-serif", fontWeight:"bold", color:"#1a1a1a", lineHeight:"1.5" },
  { id:"churchLabel", label:"Church Label", type:"static", fieldType:"text",
    staticValue:"Church",
    x:52, y:69, width:43, align:"left", fontSize:10,
    fontFamily:"Arial, sans-serif", color:"#c62828" },
  { id:"orgName", label:"Organization Name", type:"dynamic", fieldType:"text",
    dataKey:"denomination", settingsKey:"denomination",
    x:5, y:74, width:90, align:"center", fontSize:14,
    fontFamily:"Arial, sans-serif", fontWeight:"bold", color:"#1a1a1a" },
  { id:"footerNatHQ", label:"National HQ", type:"dynamic", fieldType:"paragraph",
    template:"NATIONAL HEADQUARTERS\n{{nationalHQ}}",
    x:5, y:78, width:38, align:"left", fontSize:9,
    fontFamily:"Arial, sans-serif", color:"#555", lineHeight:"1.4" },
  { id:"footerDistrict", label:"District Office", type:"dynamic", fieldType:"paragraph",
    template:"NORTHCENTRAL MINDANAO DISTRICT OFFICE\n{{districtOffice}}",
    x:52, y:78, width:43, align:"left", fontSize:9,
    fontFamily:"Arial, sans-serif", color:"#555", lineHeight:"1.4" },
  { id:"sponsorsList", label:"Sponsors List", type:"dynamic", fieldType:"sponsors",
    dataKey:"sponsors",
    x:3, y:83, width:94, fontSize:12,
    fontFamily:"Arial, sans-serif", color:"#1a1a1a" }
];

const DEFAULT_TEMPLATES = {
  baptismal: {
    name: "Certificate of Baptism",
    defaultPaper: "letter-landscape",
    pages: [
      { id:"front", name:"Certificate", background:null, backgroundColor:"#eef2ff", fields: baptismalFields }
    ]
  },
  dedication: {
    name: "Certificate of Dedication",
    defaultPaper: "letter-portrait",
    pages: [
      { id:"front", name:"Certificate", background:null, backgroundColor:"#ffffff", fields: dedicationFields }
    ]
  }
};

// ── Init data files ────────────────────────────────────────────────────────────

if (!fs.existsSync('data/settings.json'))
  fs.writeFileSync('data/settings.json', JSON.stringify(DEFAULT_SETTINGS, null, 2));
if (!fs.existsSync('data/templates.json'))
  fs.writeFileSync('data/templates.json', JSON.stringify(DEFAULT_TEMPLATES, null, 2));

// ── API: Settings ──────────────────────────────────────────────────────────────

app.get('/api/settings', (req, res) => {
  res.json(JSON.parse(fs.readFileSync('data/settings.json', 'utf8')));
});
app.post('/api/settings', (req, res) => {
  fs.writeFileSync('data/settings.json', JSON.stringify(req.body, null, 2));
  res.json({ success: true });
});

// ── API: Templates ─────────────────────────────────────────────────────────────

app.get('/api/templates', (req, res) => {
  res.json(JSON.parse(fs.readFileSync('data/templates.json', 'utf8')));
});
app.get('/api/templates/:type', (req, res) => {
  const templates = JSON.parse(fs.readFileSync('data/templates.json', 'utf8'));
  const t = templates[req.params.type];
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});
app.post('/api/templates/:type', (req, res) => {
  const templates = JSON.parse(fs.readFileSync('data/templates.json', 'utf8'));
  templates[req.params.type] = req.body;
  fs.writeFileSync('data/templates.json', JSON.stringify(templates, null, 2));
  res.json({ success: true });
});
app.delete('/api/templates/:type/reset', (req, res) => {
  const templates = JSON.parse(fs.readFileSync('data/templates.json', 'utf8'));
  if (DEFAULT_TEMPLATES[req.params.type]) {
    templates[req.params.type] = DEFAULT_TEMPLATES[req.params.type];
    fs.writeFileSync('data/templates.json', JSON.stringify(templates, null, 2));
  }
  res.json({ success: true });
});

// ── API: File upload ───────────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.params.type}-p${req.params.pageIndex}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/')) });

app.post('/api/upload/:type/:pageIndex', upload.single('background'), (req, res) => {
  if (!req.params.type) return res.status(400).json({ error: 'Missing certificate type' });
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const url = `/uploads/${req.file.filename}`;
  const templates = JSON.parse(fs.readFileSync('data/templates.json', 'utf8'));
  const t = templates[req.params.type];
  if (t && t.pages[parseInt(req.params.pageIndex)]) {
    t.pages[parseInt(req.params.pageIndex)].background = url;
    fs.writeFileSync('data/templates.json', JSON.stringify(templates, null, 2));
  }
  res.json({ url });
});

app.delete('/api/upload/:type/:pageIndex', (req, res) => {
  const templates = JSON.parse(fs.readFileSync('data/templates.json', 'utf8'));
  const t = templates[req.params.type];
  if (t && t.pages[parseInt(req.params.pageIndex)]) {
    const old = t.pages[parseInt(req.params.pageIndex)].background;
    if (old) {
      const fp = path.join('uploads', path.basename(old));
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    t.pages[parseInt(req.params.pageIndex)].background = null;
    fs.writeFileSync('data/templates.json', JSON.stringify(templates, null, 2));
  }
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Church Certificate Generator → http://localhost:${PORT}`));

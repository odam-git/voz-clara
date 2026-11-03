// ====== Estado ======
const KEY="vozclara.v1";
const S = Object.assign({sessions:[],days:{},freezes:1,freezeUsed:[],badges:{},settings:{name:"Odín",hour:"07:30",focus:"R"}}, JSON.parse(localStorage.getItem(KEY)||"{}"));
const save=()=>localStorage.setItem(KEY,JSON.stringify(S));
const today=()=>new Date().toLocaleDateString("en-CA");
const dayStr=d=>d.toLocaleDateString("en-CA");

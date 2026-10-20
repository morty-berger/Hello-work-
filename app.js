(() => {
 const $ = id => document.getElementById(id);
 let mode = "signin", client = null, currentUser = null;
 const config = window.HELLO_WORK_CONFIG || {};
 const configured = config.supabaseUrl && config.supabaseAnonKey && !config.supabaseUrl.includes("YOUR_") && !config.supabaseAnonKey.includes("YOUR_");
 if (configured && window.supabase) client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
 function note(message, type="") { $("notice").textContent = message; $("notice").className = "notice " + type; }
 function setMode(next) {
  mode = next;
  $("signInTab").classList.toggle("active", mode === "signin");
  $("signUpTab").classList.toggle("active", mode === "signup");
  $("formTitle").innerHTML = mode === "signin" ? 'Make room for<br><span>great work.</span>' : 'Start with a<br><span>fresh page.</span>';
  $("formIntro").textContent = mode === "signin" ? "Sign in to your workspace and pick up right where you left off." : "Create your account to join the Hello Work workspace.";
  $("submitBtn").innerHTML = mode === "signin" ? 'Sign in <span>→</span>' : 'Create account <span>→</span>';
  $("password").autocomplete = mode === "signin" ? "current-password" : "new-password";
  $("resetBtn").classList.toggle("hidden", mode !== "signin"); note("");
 }
 function showApp(user, profile) {
  currentUser = user; $("authPanel").classList.add("hidden"); $("appPanel").classList.remove("hidden");
  $("welcomeTitle").textContent = "You're in.";
  const label = profile?.full_name || user.email?.split("@")[0] || "there";
  $("welcomeTitle").textContent = "Hi, " + label + ".";
  $("adminPanel").classList.toggle("hidden", profile?.role !== "admin");
  if (profile?.role === "admin") loadUsers();
 }
 async function getProfile(user) {
  if (!client) return null;
  const {data,error} = await client.from("profiles").select("id,full_name,role").eq("id",user.id).maybeSingle();
  if (error) { console.error(error); return null; }
  return data;
 }
 async function refreshSession(session) {
  if (!session?.user) { currentUser=null; $("appPanel").classList.add("hidden"); $("authPanel").classList.remove("hidden"); return; }
  showApp(session.user, await getProfile(session.user));
 }
 async function loadUsers() {
  const target=$("userList"); target.textContent="Loading users…";
  const {data,error}=await client.from("profiles").select("id,full_name,role,created_at").order("created_at",{ascending:false}).limit(100);
  if(error){target.textContent="Could not load users. Check the database policies.";return;}
  target.innerHTML="";
  (data||[]).forEach(u=>{const row=document.createElement("div");row.className="user-row";const name=document.createElement("span");name.textContent=u.full_name||"Workspace member";const role=document.createElement("span");role.className="role";role.textContent=u.role||"member";row.append(name,role);target.append(row);});
  if(!data?.length) target.textContent="No user profiles yet.";
 }
 $("signInTab").addEventListener("click",()=>setMode("signin"));
 $("signUpTab").addEventListener("click",()=>setMode("signup"));
 $("authForm").addEventListener("submit",async e=>{
  e.preventDefault(); note("");
  if(!client){note("Login is not connected yet. Follow SETUP.md to connect your free Supabase project, then add its public URL and key to config.js.","error");return;}
  const email=$("email").value.trim(), password=$("password").value;
  $("submitBtn").disabled=true; $("submitBtn").textContent="Please wait…";
  try {
   if(mode==="signin"){
    const {data,error}=await client.auth.signInWithPassword({email,password}); if(error) throw error;
    await refreshSession(data.session); note("");
   } else {
    const {data,error}=await client.auth.signUp({email,password,options:{data:{full_name:email.split("@")[0]}}}); if(error) throw error;
    if(data.session) await refreshSession(data.session);
    else note("Account created. Check your email to confirm your address, then sign in.","success");
   }
  } catch(err){note(err.message||"Something went wrong. Please try again.","error");}
  finally{$("submitBtn").disabled=false;setMode(mode);}
 });
 $("resetBtn").addEventListener("click",async()=>{
  if(!client){note("Login is not connected yet. Connect Supabase first.","error");return;}
  const email=$("email").value.trim();if(!email){note("Enter your email address first.","error");return;}
  const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.href});
  note(error?error.message:"If an account exists for that email, a password-reset link will be sent.",error?"error":"success");
 });
 $("signOutBtn").addEventListener("click",async()=>{if(client) await client.auth.signOut();});
 if(client) client.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>refreshSession(session),0);});
 if(client) client.auth.getSession().then(({data})=>refreshSession(data.session));
})();
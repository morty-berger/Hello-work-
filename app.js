(() => {
 const $ = id => document.getElementById(id);
 let mode = "signin", client = null, currentUser = null, currentProfile = null;
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
  currentUser = user;
  currentProfile = profile;
  $("authPanel").classList.add("hidden");
  $("appPanel").classList.remove("hidden");
  const label = profile?.full_name || user.email?.split("@")[0] || "there";
  $("welcomeTitle").textContent = "Hi, " + label + ".";
  const isAdmin = profile?.role === "admin";
  $("adminMenu").classList.toggle("hidden", !isAdmin);
  if (!isAdmin) showHome();
 }
 function showHome() {
  $("dashboardHome").classList.remove("hidden");
  $("manageUsersView").classList.add("hidden");
 }
 function showManageUsers() {
  $("dashboardHome").classList.add("hidden");
  $("manageUsersView").classList.remove("hidden");
  if (currentProfile?.role === "admin") loadUsers();
 }
 async function getProfile(user) {
  if (!client) return null;
  const {data,error} = await client.from("profiles").select("id,full_name,role").eq("id",user.id).maybeSingle();
  if (error) { console.error(error); return null; }
  return data;
 }
 async function refreshSession(session) {
  if (!session?.user) {
   currentUser=null; currentProfile=null;
   $("appPanel").classList.add("hidden"); $("authPanel").classList.remove("hidden");
   $("manageUsersView").classList.add("hidden"); $("dashboardHome").classList.remove("hidden");
   $("adminMenu").classList.add("hidden"); return;
  }
  showApp(session.user, await getProfile(session.user));
 }
 async function loadUsers() {
  const target=$("userTableBody"), count=$("userCount"), notice=$("usersNotice");
  target.innerHTML='<tr><td colspan="4" class="table-message">Loading registered users…</td></tr>';
  count.textContent="…"; notice.textContent="";
  const {data,error}=await client.rpc("admin_list_hello_work_users");
  if(error) {
   console.error(error);
   target.innerHTML='<tr><td colspan="4" class="table-message">Could not load users. Please check the admin database setup.</td></tr>';
   count.textContent="—"; notice.textContent=error.message || "Unable to load users."; return;
  }
  const users=data||[]; count.textContent=String(users.length); target.innerHTML="";
  users.forEach(u=>{
   const row=document.createElement("tr");
   const userCell=document.createElement("td"), userName=document.createElement("div"), userMeta=document.createElement("div");
   userName.className="table-user-name"; userName.textContent=u.full_name||"New member";
   userMeta.className="table-user-meta"; userMeta.textContent="Hello Work account";
   userCell.append(userName,userMeta);
   const emailCell=document.createElement("td"); emailCell.className="email-cell"; emailCell.textContent=u.email||"—";
   const roleCell=document.createElement("td"), role=document.createElement("span"); role.className="role-chip "+(u.role==="admin"?"role-admin":""); role.textContent=u.role||"member"; roleCell.append(role);
   const joinedCell=document.createElement("td"); joinedCell.className="date-cell";
   joinedCell.textContent=u.created_at?new Date(u.created_at).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}):"—";
   row.append(userCell,emailCell,roleCell,joinedCell); target.append(row);
  });
  if(!users.length) target.innerHTML='<tr><td colspan="4" class="table-message">No accounts have signed up yet.</td></tr>';
 } $("adminMenuToggle").addEventListener("click",()=>{ const items=$("adminMenuItems"), opening=items.classList.contains("hidden"); items.classList.toggle("hidden",!opening); $("adminMenuToggle").setAttribute("aria-expanded",String(opening)); });
 $("manageUsersBtn").addEventListener("click",showManageUsers);
 $("refreshUsersBtn").addEventListener("click",loadUsers);
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
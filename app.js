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
  $("sidebarNav").classList.remove("hidden");
  $("sideNote").classList.add("hidden");
  $("sidebarAdminSection").classList.toggle("hidden",!isAdmin);
  document.querySelectorAll("[data-sidebar-department]").forEach(button=>button.classList.remove("active"));
  if (!isAdmin && $("manageUsersView").classList.contains("hidden") === false) showHome();
 }
 function showHome() {
  $("dashboardHome").classList.remove("hidden");
  $("departmentView").classList.add("hidden");
  $("manageUsersView").classList.add("hidden");
  $("salesProjectsView").classList.add("hidden");
 }
 const departments = {
  sales: {
   eyebrow:"DEPARTMENT 01 · SALES", title:"Sales",
   intro:"Move opportunities forward, from the first conversation to a won job.",
   tools:[
    ["♙","Leads & contacts","Keep track of prospects, customers and key contacts."],
    ["▤","Opportunities & bids","Organize estimates, proposals, bid dates and next steps."],
    ["↻","Follow-ups","See who needs a call, email or proposal update."]
   ]
  },
  operations: {
   eyebrow:"DEPARTMENT 02 · OPERATIONS", title:"Operations",
   intro:"Keep awarded work organized from handoff through completion.",
   tools:[
    ["▦","Job board","See active jobs, status, owners and upcoming milestones."],
    ["◷","Scheduling","Coordinate crews, site dates, deliveries and deadlines."],
    ["✓","Field progress","Track scope, site updates, materials and open issues."]
   ]
  },
  finance: {
   eyebrow:"DEPARTMENT 03 · FINANCE", title:"Finance",
   intro:"Understand what each job costs, what is owed and how the business is performing.",
   tools:[
    ["$","Job profitability","Compare estimated costs, actual costs and expected margin."],
    ["▤","Invoices & receivables","Track invoices, payment status and outstanding balances."],
    ["↗","Cash flow & reporting","Get a clear view of money coming in and going out."]
   ]
  }
 };
 function showDepartment(key) {
  if(key==="sales"){showSalesProjects();return;}
  const dept=departments[key]; if(!dept) return;
  $("dashboardHome").classList.add("hidden");
  $("manageUsersView").classList.add("hidden");
  $("salesProjectsView").classList.add("hidden");
  $("departmentView").classList.remove("hidden");
  $("departmentEyebrow").textContent=dept.eyebrow;
  $("departmentTitle").textContent=dept.title;
  $("departmentIntro").textContent=dept.intro;
  const tools=$("departmentTools"); tools.innerHTML="";
  dept.tools.forEach(item=>{
   const card=document.createElement("article"); card.className="department-tool-card";
   const icon=document.createElement("span"); icon.className="tool-icon"; icon.textContent=item[0];
   const title=document.createElement("h3"); title.textContent=item[1];
   const description=document.createElement("p"); description.textContent=item[2];
   const status=document.createElement("span"); status.className="tool-status"; status.textContent="PLANNED";
   card.append(icon,title,description,status); tools.append(card);
  });
 }

 const projectStatuses=[{key:"lead",label:"Lead"},{key:"sale",label:"Sale"},{key:"active",label:"Active project"},{key:"complete",label:"Complete project"},{key:"lost",label:"Lost project"}];
 let salesProjects=[], projectFilter="all", projectSearchTerm="";
 function showSalesProjects(){ $("dashboardHome").classList.add("hidden");$("departmentView").classList.add("hidden");$("manageUsersView").classList.add("hidden");$("salesProjectsView").classList.remove("hidden");loadSalesProjects(); }
 function projectMoney(value){return value===null||value===""||value===undefined?"":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(value));}
 function renderSalesStats(){
  const target=$("salesStats");target.innerHTML="";
  [{key:"all",label:"All projects"},...projectStatuses.map(s=>({key:s.key,label:s.label}))].forEach(s=>{
   const n=s.key==="all"?salesProjects.length:salesProjects.filter(p=>p.status===s.key).length;
   const b=document.createElement("button");b.type="button";b.className="sales-stat"+(projectFilter===s.key?" active":"");b.setAttribute("aria-pressed",String(projectFilter===s.key));
   const strong=document.createElement("strong");strong.textContent=String(n);const label=document.createElement("span");label.textContent=s.label;b.append(strong,label);
   b.addEventListener("click",()=>{projectFilter=s.key;renderSalesStats();renderProjectFilters();renderSalesProjectList();});target.append(b);
  });
 }
 function renderProjectFilters(){
  const target=$("projectFilters");target.innerHTML="";
  [{key:"all",label:"All"},...projectStatuses].forEach(s=>{const b=document.createElement("button");b.type="button";b.className="project-filter"+(projectFilter===s.key?" active":"");b.textContent=s.label;b.addEventListener("click",()=>{projectFilter=s.key;renderSalesStats();renderProjectFilters();renderSalesProjectList();});target.append(b);});
 }
 function renderSalesProjectList(){
  const target=$("salesProjectList");target.innerHTML="";
  const term=projectSearchTerm.trim().toLowerCase();
  const rows=salesProjects.filter(p=>(projectFilter==="all"||p.status===projectFilter)&&(!term||[p.title,p.customer_name,p.contact_email].some(v=>(v||"").toLowerCase().includes(term))));
  if(!rows.length){const box=document.createElement("div");box.className="projects-empty";const h=document.createElement("h3");h.textContent=salesProjects.length?"No matching projects":"Your sales pipeline starts here";const p=document.createElement("p");p.textContent=salesProjects.length?"Try another search or status filter.":"Create your first project. It starts as a Lead, then move it through the pipeline.";box.append(h,p);if(!salesProjects.length){const b=document.createElement("button");b.type="button";b.className="primary";b.textContent="＋ New project";b.addEventListener("click",openNewProjectForm);box.append(b);}target.append(box);return;}
  rows.forEach(project=>{
   const card=document.createElement("article");card.className="sales-project-card";
   const top=document.createElement("div");top.className="sales-project-top";const tw=document.createElement("div");tw.className="sales-project-title-wrap";
   const h=document.createElement("h3");h.textContent=project.title;const customer=document.createElement("p");customer.className="sales-project-customer";customer.textContent=project.customer_name||"Customer not added";tw.append(h,customer);
   const select=document.createElement("select");select.className="project-status-select status-"+project.status;select.setAttribute("aria-label","Change status for "+project.title);
   projectStatuses.forEach(s=>{const o=document.createElement("option");o.value=s.key;o.textContent=s.label;o.selected=s.key===project.status;select.append(o);});
   select.addEventListener("change",()=>updateProjectStatus(project.id,select.value));top.append(tw,select);card.append(top);
   const details=document.createElement("div");details.className="sales-project-details";
   if(project.estimated_value!==null&&project.estimated_value!==""){const value=document.createElement("span");value.className="project-value";value.textContent=projectMoney(project.estimated_value);details.append(value);}
   if(project.contact_email){const email=document.createElement("span");email.className="project-email";email.textContent=project.contact_email;details.append(email);}
   const date=document.createElement("span");date.className="project-created";date.textContent="Created "+new Date(project.created_at).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});details.append(date);card.append(details);
   if(project.notes){const notes=document.createElement("p");notes.className="sales-project-notes";notes.textContent=project.notes;card.append(notes);}target.append(card);
  });
 }
 async function loadSalesProjects(){
  const target=$("salesProjectList");target.innerHTML='<div class="projects-loading">Loading sales projects…</div>';$("projectsNotice").textContent="";
  if(!client){target.textContent="Please sign in to load sales projects.";return;}
  const {data,error}=await client.from("sales_projects").select("id,title,customer_name,contact_email,estimated_value,status,notes,created_at").order("created_at",{ascending:false});
  if(error){console.error(error);target.textContent="Could not load projects: "+error.message;return;}
  salesProjects=data||[];renderSalesStats();renderProjectFilters();renderSalesProjectList();
 }
 async function updateProjectStatus(id,status){
  $("projectsNotice").textContent="Saving status…";
  const {error}=await client.from("sales_projects").update({status,updated_at:new Date().toISOString()}).eq("id",id);
  if(error){$("projectsNotice").textContent="Status wasn't saved: "+error.message;await loadSalesProjects();return;}
  const p=salesProjects.find(item=>item.id===id);if(p)p.status=status;$("projectsNotice").textContent="Project status updated.";renderSalesStats();renderProjectFilters();renderSalesProjectList();
 }
 function openNewProjectForm(){$("newProjectForm").classList.remove("hidden");$("projectFormNotice").textContent="";$("projectTitle").focus();}
 function closeNewProjectForm(){$("newProjectForm").classList.add("hidden");$("newProjectForm").reset();$("projectFormNotice").textContent="";}
 $("newProjectBtn").addEventListener("click",openNewProjectForm);
 $("cancelNewProject").addEventListener("click",closeNewProjectForm);$("cancelNewProjectBottom").addEventListener("click",closeNewProjectForm);
 $("projectSearch").addEventListener("input",e=>{projectSearchTerm=e.target.value;renderSalesProjectList();});
 $("salesBackBtn").addEventListener("click",showHome);
 $("newProjectForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!client||!currentUser)return;
  const title=$("projectTitle").value.trim();if(!title){$("projectFormNotice").textContent="Please enter a project name.";return;}
  const raw=$("projectValue").value;const record={title,customer_name:$("projectCustomer").value.trim(),contact_email:$("projectEmail").value.trim(),estimated_value:raw===""?null:Number(raw),notes:$("projectNotes").value.trim(),status:"lead",created_by:currentUser.id};
  const save=$("saveNewProject");save.disabled=true;save.textContent="Creating…";$("projectFormNotice").textContent="";
  const {error}=await client.from("sales_projects").insert(record);save.disabled=false;save.innerHTML='Create lead <span>→</span>';
  if(error){$("projectFormNotice").textContent="Could not create project: "+error.message;return;}
  closeNewProjectForm();projectFilter="all";projectSearchTerm="";$("projectSearch").value="";await loadSalesProjects();$("projectsNotice").textContent="Project created as a Lead.";
 });
 $("sidebarToggle").addEventListener("click",()=>{
  const shell=document.querySelector(".shell");
  if(window.matchMedia("(max-width:720px)").matches){
   const opening=!document.body.classList.contains("mobile-sidebar-open");document.body.classList.toggle("mobile-sidebar-open",opening);$("sidebarToggle").setAttribute("aria-expanded",String(opening));$("sidebarToggle").setAttribute("aria-label",opening?"Close menu":"Open menu");$("sidebarToggle").querySelector(".sidebar-toggle-label").textContent=opening?"Close menu":"Menu";
  }else{
   const collapsed=shell.classList.toggle("sidebar-collapsed");$("sidebarToggle").setAttribute("aria-expanded",String(!collapsed));$("sidebarToggle").setAttribute("aria-label",collapsed?"Show sidebar":"Hide sidebar");$("sidebarToggle").querySelector(".sidebar-toggle-label").textContent=collapsed?"Show menu":"Hide menu";
  }
 });
 function closeMobileSidebar(){document.body.classList.remove("mobile-sidebar-open");if($("sidebarToggle")){$("sidebarToggle").setAttribute("aria-expanded","false");$("sidebarToggle").setAttribute("aria-label","Open menu");$("sidebarToggle").querySelector(".sidebar-toggle-label").textContent="Menu";}}
 $("sidebarClose").addEventListener("click",closeMobileSidebar);

 function showManageUsers() {
  $("dashboardHome").classList.add("hidden");
  $("departmentView").classList.add("hidden");
  $("salesProjectsView").classList.add("hidden");
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
   $("sidebarNav").classList.add("hidden"); $("sideNote").classList.remove("hidden"); return;
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
   userCell.dataset.label="User"; userCell.append(userName,userMeta);
   const emailCell=document.createElement("td"); emailCell.className="email-cell"; emailCell.dataset.label="Email"; emailCell.textContent=u.email||"—";
   const roleCell=document.createElement("td"), role=document.createElement("span"); roleCell.dataset.label="Role"; role.className="role-chip "+(u.role==="admin"?"role-admin":""); role.textContent=u.role||"member"; roleCell.append(role);
   const joinedCell=document.createElement("td"); joinedCell.dataset.label="Joined"; joinedCell.className="date-cell";
   joinedCell.textContent=u.created_at?new Date(u.created_at).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}):"—";
   row.append(userCell,emailCell,roleCell,joinedCell); target.append(row);
  });
  if(!users.length) target.innerHTML='<tr><td colspan="4" class="table-message">No accounts have signed up yet.</td></tr>';
 }
 document.querySelectorAll("[data-sidebar-department]").forEach(button=>button.addEventListener("click",()=>{
  const key=button.dataset.sidebarDepartment; showDepartment(key);
  document.querySelectorAll("[data-sidebar-department]").forEach(item=>item.classList.toggle("active",item===button));
  closeMobileSidebar();
 }));
 $("sidebarManageUsersBtn").addEventListener("click",()=>{showManageUsers();document.querySelectorAll("[data-sidebar-department]").forEach(item=>item.classList.remove("active"));closeMobileSidebar();});
 $("brandHome").addEventListener("click",event=>{event.preventDefault();showHome();document.querySelectorAll("[data-sidebar-department]").forEach(item=>item.classList.remove("active"));closeMobileSidebar();});
 $("backToDepartments").addEventListener("click",showHome);
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
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { CheckCircle2, XCircle, Loader2, LockKeyhole } from "lucide-react";

export function SettingsPage(){
 const [industry,setIndustry]=useState(localStorage.getItem("aigov.defaultIndustry")||"Financial Services / Banking"); const [region,setRegion]=useState(localStorage.getItem("aigov.defaultRegion")||"India"); const [status,setStatus]=useState<"checking"|"ok"|"fail">("checking");
 function test(){setStatus("checking");api.health().then(()=>setStatus("ok")).catch(()=>setStatus("fail"));}
 useEffect(()=>{test();},[]);
 function save(){localStorage.setItem("aigov.defaultIndustry",industry);localStorage.setItem("aigov.defaultRegion",region);}
 return <AppShell title="Settings" subtitle="Manage assessment preferences and view service health."><div className="mx-auto max-w-2xl space-y-5"><Card><CardHeader><CardTitle>Assessment defaults</CardTitle><CardDescription>These preferences speed up new assessments. Deployment configuration and secrets are managed securely by the server.</CardDescription></CardHeader><CardContent className="space-y-4"><div><Label>Default industry</Label><Select value={industry} onChange={e=>setIndustry(e.target.value)}><option>Financial Services / Banking</option><option>Healthcare</option><option>Employment / HR</option><option>Insurance</option><option>General</option></Select></div><div><Label>Default jurisdiction</Label><Select value={region} onChange={e=>setRegion(e.target.value)}><option>India</option><option>European Union</option><option>United States</option><option>United Kingdom</option><option>Global</option></Select></div><Button onClick={save}>Save preferences</Button></CardContent></Card><Card><CardHeader><CardTitle>Service health</CardTitle><CardDescription>The backend address and credentials are deployment-managed and cannot be changed in the browser.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><LockKeyhole className="h-4 w-4"/> AI-provider and database secrets remain server-side.</div><Button variant="outline" onClick={test} disabled={status==="checking"}>{status==="checking"&&<Loader2 className="h-4 w-4 animate-spin"/>}Retry connection</Button>{status==="ok"&&<Alert variant="success" title="All core services reachable"><CheckCircle2 className="mr-1 inline h-4 w-4"/>The assessment API is ready.</Alert>}{status==="fail"&&<Alert variant="error" title="Service unavailable"><XCircle className="mr-1 inline h-4 w-4"/>The application could not reach the assessment service. Retry shortly or contact the administrator.</Alert>}</CardContent></Card></div></AppShell>;
}

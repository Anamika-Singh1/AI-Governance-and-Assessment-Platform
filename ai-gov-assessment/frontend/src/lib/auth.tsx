import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { api, AuthUser } from "./api";

const AuthContext=createContext<{user:AuthUser|null;loading:boolean;login:(e:string,p:string)=>Promise<void>;register:(n:string,e:string,p:string)=>Promise<void>;resetPassword:(t:string,p:string)=>Promise<void>;logout:()=>Promise<void>}|null>(null);
export function AuthProvider({children}:{children:ReactNode}){
  const [user,setUser]=useState<AuthUser|null>(null); const [loading,setLoading]=useState(true);
  useEffect(()=>{api.me().then(r=>setUser(r.user)).catch(()=>setUser(null)).finally(()=>setLoading(false));},[]);
  return <AuthContext.Provider value={{user,loading,login:async(email,password)=>setUser((await api.login({email,password})).user),register:async(name,email,password)=>setUser((await api.register({name,email,password})).user),resetPassword:async(token,password)=>setUser((await api.resetPassword(token,password)).user),logout:async()=>{await api.logout();setUser(null);}}}>{children}</AuthContext.Provider>;
}
export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error("useAuth must be used inside AuthProvider");return value;}

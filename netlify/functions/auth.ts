import { getUser, login, logout, verifyRequestOrigin } from '@netlify/identity';
import type { Context } from '@netlify/functions';
export default async function handler(req:Request,_context:Context){
  const path=new URL(req.url).pathname;
  try{
    if(path.endsWith('/login')&&req.method==='POST'){
      verifyRequestOrigin(req);
      const body=await req.json() as {email?:string;password?:string};
      if(!body.email||!body.password)return Response.json({error:'Συμπληρώστε email και κωδικό.'},{status:400});
      await login(body.email,body.password);
      return Response.json({ok:true});
    }
    if(path.endsWith('/logout')&&req.method==='POST'){
      verifyRequestOrigin(req);await logout();return Response.json({ok:true});
    }
    if(path.endsWith('/me')&&req.method==='GET'){
      const user=await getUser();
      if(!user)return Response.json({user:null},{status:401});
      return Response.json({user:{email:user.email,roles:user.roles}});
    }
    return new Response('Not found',{status:404});
  }catch{return Response.json({error:'Λανθασμένο email ή κωδικός πρόσβασης.'},{status:401});}
}

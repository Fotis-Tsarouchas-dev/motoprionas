import { getUser } from '@netlify/identity';
export class AuthError extends Error { constructor(public status:number,message:string){super(message);} }
export async function requireAdmin(){
  const user=await getUser();
  if(!user) throw new AuthError(401,'Unauthorized');
  if(!user.roles?.includes('admin')) throw new AuthError(403,'Forbidden');
  const allow=process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if(allow && user.email?.toLowerCase()!==allow) throw new AuthError(403,'Forbidden');
  return user;
}

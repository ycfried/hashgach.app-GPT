import InviteSignup from "./signup";

export default async function InvitePage({params}:{params:Promise<{token:string}>}){const {token}=await params;return <InviteSignup token={token}/>}

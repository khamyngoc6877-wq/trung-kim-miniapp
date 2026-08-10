import { useEffect } from "react";
import { showOAWidget } from "zmp-sdk/apis";
import { useTranslation } from "@/hooks/use-translation";
export default function FollowOAWidget(){ const {t,language}=useTranslation(); useEffect(()=>{showOAWidget({id:"oaWidget",guidingText:t("profile","followOA"),color:"#F7F7F8"});},[language,t]); return <div id="oaWidget"/>; }

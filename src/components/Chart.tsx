"use client";
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);
export interface ChartData { labels:string[]; values:number[]; colors?:string[] }
const PALETTE=["#2563eb","#16a34a","#f59e0b","#ef4444","#8b5cf6","#0891b2","#db2777","#65a30d","#f97316","#0f766e"];
export function DoughnutChart({data}:{data:ChartData}){return(<Doughnut data={{labels:data.labels,datasets:[{data:data.values,backgroundColor:data.colors??PALETTE,borderWidth:0}]}} options={{plugins:{legend:{position:"right"}},maintainAspectRatio:false}}/>)}
export function BarChart({data}:{data:ChartData}){return(<Bar data={{labels:data.labels,datasets:[{label:"Progress %",data:data.values,backgroundColor:data.colors??PALETTE[0],borderRadius:6}]}} options={{indexAxis:"y",scales:{x:{beginAtZero:true,max:100}},plugins:{legend:{display:false}},maintainAspectRatio:false}}/>)}
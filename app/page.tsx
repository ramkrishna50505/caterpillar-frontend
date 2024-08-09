// app/page.tsx
"use client";
import React, { useState } from "react";
import { Menu, MenuItem, HoveredLink } from "../components/navbar/page";
import dynamic from 'next/dynamic';
const VoiceForm = dynamic(() => import('../VoiceForm'), { ssr: false });


const Page = () => {
  const [activeItem, setActiveItem] = useState<string | null>(null);

  return (
    <div>
      <Menu setActive={setActiveItem}>
        <MenuItem setActive={setActiveItem} active={activeItem} item="Dashboard" >
          <HoveredLink href="/">Dashboard</HoveredLink>
        </MenuItem>
        <MenuItem setActive={setActiveItem} active={activeItem} item="New Inspection">
          <HoveredLink href="/newinspection">New Inspection</HoveredLink>
        </MenuItem>
        <MenuItem setActive={setActiveItem} active={activeItem} item="History">
          <HoveredLink href="/about">View all history</HoveredLink>
        </MenuItem>
      </Menu>   
<div>
<div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Voice-to-Text Form</h1>
      <VoiceForm />
    </div>


  
</div>
    </div>

    

    
  );
};

export default Page;

import React, { useState } from "react";
import FileUpload from "../components/FileUpload";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 flex flex-col items-center justify-center px-2">
      <div className="max-w-lg w-full bg-white/80 rounded-xl shadow-xl mt-12 p-8 mb-12 animate-fade-in backdrop-blur-sm">
        <h1 className="text-4xl font-bold text-primary mb-2 text-center tracking-tight">
          FileSend
        </h1>
        <p className="text-md mb-6 text-gray-600 text-center">
          Secure, ephemeral file sharing.<br />
          Files self-destruct after a view or set time. No sign up. No fuss.
        </p>
        <FileUpload />
      </div>
      <footer className="text-center text-xs text-gray-400 mb-4">
        &copy; {new Date().getFullYear()} FileSend &middot; Privacy-first file transfer
      </footer>
      <Toaster />
    </div>
  );
};

export default Index;

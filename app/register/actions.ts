"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getOfficers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("officers")
    .select("id, name")
    .order("name")

  if (error) {
    console.error("Error fetching officers:", error)
    return []
  }

  return data || []
}

export async function getCategories() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categories")
    .select("id, code, name, description")
    .order("code")

  if (error) {
    console.error("Error fetching categories:", error)
    return []
  }

  return data || []
}

export async function generateFileReference(categoryCode: string) {
  const supabase = await createClient()
  const year = new Date().getFullYear()
  
  // Get the count of files for this category in the current year
  const { count, error } = await supabase
    .from("files")
    .select("*", { count: "exact", head: true })
    .ilike("file_reference", `${categoryCode}/${year}/%`)

  if (error) {
    console.error("Error generating reference:", error)
    return `${categoryCode}/${year}/001`
  }

  const nextNumber = ((count || 0) + 1).toString().padStart(3, "0")
  return `${categoryCode}/${year}/${nextNumber}`
}

export async function registerFile(formData: {
  file_reference: string
  category_id: string
  client_name: string
  registration_id?: string
  date_received: string
  assigned_officer_id?: string
  physical_location?: string
  status: string
  category_specific_data?: Record<string, unknown>
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("files")
    .insert({
      file_reference: formData.file_reference,
      category_id: formData.category_id,
      client_name: formData.client_name,
      registration_id: formData.registration_id || null,
      date_received: formData.date_received,
      assigned_officer_id: formData.assigned_officer_id || null,
      physical_location: formData.physical_location || null,
      status: formData.status,
      category_details: formData.category_specific_data || null,
    })
    .select()
    .single()

  if (error) {
    console.error("Error registering file:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/files")
  revalidatePath("/register")
  
  return { success: true, data }
}

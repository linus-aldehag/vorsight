"use client"

import { forwardRef, type ElementRef, type ComponentPropsWithoutRef } from "react"
import { Root, List, Trigger, Content } from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = Root

const TabsList = forwardRef<
    ElementRef<typeof List>,
    ComponentPropsWithoutRef<typeof List>
>(({ className, ...props }, ref) => (
    <List
        ref={ref}
        className={cn(
            "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
            className
        )}
        {...props}
    />
))
TabsList.displayName = List.displayName

const TabsTrigger = forwardRef<
    ElementRef<typeof Trigger>,
    ComponentPropsWithoutRef<typeof Trigger>
>(({ className, ...props }, ref) => (
    <Trigger
        ref={ref}
        className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-md",
            className
        )}
        {...props}
    />
))
TabsTrigger.displayName = Trigger.displayName

const TabsContent = forwardRef<
    ElementRef<typeof Content>,
    ComponentPropsWithoutRef<typeof Content>
>(({ className, ...props }, ref) => (
    <Content
        ref={ref}
        className={cn(
            "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className
        )}
        {...props}
    />
))
TabsContent.displayName = Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }

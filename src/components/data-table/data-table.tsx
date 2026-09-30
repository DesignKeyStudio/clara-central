"use client";

import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  type OnChangeFn,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { Table as TanstackTable } from "@tanstack/react-table";
import { useState, useEffect } from "react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchValue?: string;
  pageSize?: number;
  emptyMessage?: string;
  showPagination?: boolean;
  showColumnVisibility?: boolean;
  enableRowSelection?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  getRowId?: (row: TData) => string;
  initialColumnVisibility?: VisibilityState;
  renderToolbar?: (table: TanstackTable<TData>) => React.ReactNode;
  isLoading?: boolean;
  highlightRowId?: string | null;
  onHighlightComplete?: () => void;
  /** When set, rows become clickable and call this with the row's data. Nested
   *  interactive elements (links, buttons) should `stopPropagation`. */
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchValue = "",
  pageSize = 10,
  emptyMessage = "No results found.",
  showPagination = true,
  showColumnVisibility = true,
  enableRowSelection = false,
  rowSelection: externalRowSelection,
  onRowSelectionChange: externalOnRowSelectionChange,
  getRowId,
  initialColumnVisibility,
  renderToolbar,
  isLoading = false,
  highlightRowId = null,
  onHighlightComplete,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialColumnVisibility ?? {});
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({});

  const rowSelectionState = externalRowSelection ?? internalRowSelection;
  const rowSelectionHandler = externalOnRowSelectionChange ?? setInternalRowSelection;

  // Auto-clear highlight after animation duration
  useEffect(() => {
    if (!highlightRowId) return;
    const timer = setTimeout(() => onHighlightComplete?.(), 2000);
    return () => clearTimeout(timer);
  }, [highlightRowId, onHighlightComplete]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: showPagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    enableRowSelection,
    onRowSelectionChange: rowSelectionHandler,
    getRowId: getRowId as ((originalRow: TData, index: number, parent?: { id: string }) => string) | undefined,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter: searchValue,
      ...(enableRowSelection ? { rowSelection: rowSelectionState } : {}),
    },
    onGlobalFilterChange: () => {},
    initialState: {
      pagination: { pageSize },
    },
  });

  return (
    <div className="space-y-4">
      {renderToolbar && renderToolbar(table)}
      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getCanSort() ? header.column.getIsSorted() : false;
                  return (
                    <TableHead
                      key={header.id}
                      className="whitespace-nowrap"
                      aria-sort={
                        sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : header.column.getCanSort()
                              ? "none"
                              : undefined
                      }
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {table.getVisibleLeafColumns().map((col) => (
                    <TableCell key={col.id}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const isHighlighted = highlightRowId != null && row.id === highlightRowId;
                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    data-highlight={isHighlighted || undefined}
                    style={isHighlighted ? { animation: "row-highlight 2s ease-out" } : undefined}
                    className={onRowClick ? "cursor-pointer" : undefined}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {showPagination && table.getRowModel().rows.length > 0 && (
        <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm tabular-nums text-[#9E9D9D]">
            Showing{" "}
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
            –
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{" "}
            of {table.getFilteredRowModel().rows.length} results
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Results per page:</span>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger className="w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 15, 25, 50, 100].map((size) => (
                    <SelectItem key={size} value={`${size}`}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Go to first page" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Go to previous page" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2 whitespace-nowrap" aria-live="polite">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Go to next page" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Go to last page" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

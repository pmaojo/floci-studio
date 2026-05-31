# API Payload/Return Mismatches Review

## Overview
This review identifies discrepancies between:
- Frontend API contract definitions (`src/lib/sidecarApi.ts`)
- Backend route handlers (`mcp/floci_backend/api/*.py`)
- Service implementations (`mcp/floci_backend/application/*.py`)

---

## Critical Mismatches

### 1. **Lambda Endpoints - Inconsistent Response Wrapper**

**Issue**: Lambda routes return raw service responses, not wrapped in `{ok: boolean}` structure.

**Frontend Expectations** (`sidecarApi.ts` lines 244-265):
```typescript
listLambdaFunctions: () => requestSidecar<{ Functions?: any[] }>('/api/lambda/functions')
getLambdaCapabilities: () => requestSidecar<LambdaCapabilities>(...)
createLambdaFunction: (payload) => requestSidecar<any>(...)
```

**Backend Implementation** (`lambda_routes.py` lines 13-59):
- Line 14-15: `list_functions()` returns raw AWS CLI output `{ Functions: [...] }`
- Lines 18-22: `create_function()` returns raw service response
- No `{ ok: boolean, ... }` wrapper applied

**Frontend Usage** (verified in `LambdaView.tsx` line 83):
```typescript
const response = await sidecarApi.listLambdaFunctions();
setFunctions((response.Functions || []) as LambdaFunctionRecord[]);
// Expects response.Functions directly
```

**Problem**: 
- **Inconsistency**: Marketplace/Athena/others use `{ok: true, ...}`, Lambda doesn't
- **Fortunate Design**: Frontend types match raw AWS responses (`{ Functions?: any[] }`), so it works
- **Fragile**: If wrapper is added later, breaks frontend without explicit update
- **Error Handling**: Lambda errors return `{error: ...}` but success responses aren't wrapped consistently

**Example Flow**:
```
Success: AWS returns { Functions: [...] } → Backend passes through → Frontend gets { Functions: [...] } ✓
Error: Backend throws → HTTPException handler converts to { error: "message" } → Frontend sees error ✓
```

**Why This Works (but shouldn't)**:
- AWS Lambda responses already have top-level keys (Functions, FunctionArn, etc.)
- Frontend types explicitly expect these raw AWS keys, not `{ok, Functions}`
- This is accidental alignment, not intentional design

**Recommended Fix**: Add consistency wrapper while maintaining backward compatibility
```python
# Current (works but inconsistent)
return await lambda_service.list_functions()
# Returns: { Functions: [...] }

# Option 1: Wrap with ok (breaks frontend unless updated)
return { 'ok': True, **result }
# Returns: { ok: True, Functions: [...] }

# Option 2: Update frontend types to not expect raw AWS shape
# This would require careful refactoring
```

**Current Status**: WORKING but INCONSISTENT. Recommend addressing in broader API standardization.

---

### 2. **Athena Query Start Response - Fragile Unpacking (Works but Fragile)**

**Issue**: Uses `**result` to spread service response, assumes specific field structure.

**Frontend Expectation** (`sidecarApi.ts` line 310):
```typescript
startAthenaQuery: (query, database, workGroup?) => 
  requestSidecar<{ ok: boolean; queryExecutionId: string }>('/api/athena/query', {...})
```

**Backend Implementation** (`athena_routes.py` lines 17-30):
```python
@router.post('/athena/query')
async def start_query(request: Dict[str, Any]) -> Dict[str, Any]:
    result = await athena_service.start_query(query, database, work_group)
    return {'ok': True, **result}  # Line 28: Spreads entire service response
```

**Service Implementation Verified** (`athena_service.py` line 95):
```python
return {'queryExecutionId': execution_id}
```

**Assessment**: ✓ **Currently Works** but fragile design.
- Service returns `{ queryExecutionId: ... }` ✓
- Route spreads it to `{ ok: True, queryExecutionId: ... }` ✓
- Frontend gets expected shape ✓

**Problem with Spread Pattern**:
```python
# Current pattern (line 28)
return {'ok': True, **result}

# What if service evolves to add extra fields?
# Example: {'queryExecutionId': '...', 'submittedAt': '...', 'metadata': {...}}
# Frontend now gets unexpected extra fields (usually OK but not explicit)

# What if result is None or has unexpected structure?
# The spread silently fails or produces empty response
```

**Better Practice**:
```python
# Explicit construction - type-safe, forward-compatible
return {
    'ok': True,
    'queryExecutionId': result.get('queryExecutionId')
}
```

**Recommendation**: Low priority refactor - current approach works but risks silent failures if service structure changes.

---

### 3. **Marketplace Endpoints - Response Structure Contract**

**Issue**: Some endpoints return `{ok, installations}` while others may return different structures.

**Frontend Expectations** (`sidecarApi.ts` lines 294-308):
```typescript
listRecipes: () => requestSidecar<{ ok: boolean; recipes: Recipe[] }>
getInstallations: () => requestSidecar<{ ok: boolean; installations: Record<string, Installation> }>
getRecipeLogs: () => requestSidecar<{ ok: boolean; logs: string[] }>
installRecipe: () => requestSidecar<{ ok: boolean; installation: Installation }>
```

**Backend Implementation** (`marketplace_routes.py` lines 9-51):
- Lines 9-15: `list_recipes()` ✓ Returns `{ ok: True, recipes: [...] }`
- Lines 17-23: `get_installations()` ✓ Returns `{ ok: True, installations: {...} }`
- Lines 25-31: `get_logs()` ✓ Returns `{ ok: True, logs: [...] }`
- Lines 33-43: `install_recipe()` ✓ Returns `{ ok: True, installation: {...} }`
- Lines 45-51: `uninstall_recipe()` ✓ Returns `{ ok: True, installation: {...} }`

**Assessment**: ✓ **Correct** - All marketplace endpoints properly wrap responses.

---

### 4. **AWS Service Resource Operations - Return Type ✓ VERIFIED CORRECT**

**Frontend Expectations** (`sidecarApi.ts` lines 269-291):
```typescript
createCodeArtifactDomain: (name) => 
  requestSidecar<AwsServiceOverview>('/api/aws-services/codeartifact/domains', ...)
```

**Backend Implementation** (`compatibility_service.py` lines 336-350):
```python
async def _get_code_artifact_overview(self) -> Dict[str, Any]:
    return {
        'serviceKey': 'codeartifact',
        'serviceName': 'CodeArtifact',
        'description': '...',
        'endpointUrl': config.aws_endpoint_url,
        'region': config.aws_region,
        'generatedAt': datetime.utcnow().isoformat() + "Z",
        'source': 'sidecar-compat',
        'resources': [...]
    }
```

**Assessment**: ✓ **Correct** - Returns proper `AwsServiceOverview` structure with all required fields.
- `serviceKey`, `serviceName`, `description` ✓
- `endpointUrl`, `region` ✓
- `generatedAt` (ISO timestamp) ✓
- `source` (additional field) ✓
- `resources` array ✓

---

### 5. **EKS Overview - Response Structure ✓ VERIFIED CORRECT**

**Frontend Expectation** (`sidecarApi.ts` line 266):
```typescript
getEksOverview: () => requestSidecar<EksOverview>('/api/eks/overview')

interface EksOverview {
  endpointUrl: string;
  region: string;
  clusters: EksClusterSummary[];
  kubernetes: { available: boolean; source?: string; reason?: string; pods: [...] };
}
```

**Backend Implementation** (`eks_service.py` lines 12-24):
```python
async def get_overview(self) -> Dict[str, Any]:
    return {
        'endpointUrl': config.aws_endpoint_url,
        'region': config.aws_region,
        'clusters': list(clusters),
        'kubernetes': kubernetes,
    }
```

**Assessment**: ✓ **Correct** - EKS service returns proper `EksOverview` structure.
- **Note**: Unlike marketplace/athena, EKS doesn't wrap in `{ok: boolean}` - this is correct because `requestSidecar` doesn't require it, and EKS returns data directly

---

### 6. **Auth Profiles - Return Type Mismatch**

**Issue**: Backend returns different field naming than type definitions.

**Frontend Expectation** (`sidecarApi.ts` lines 1-8, 319):
```typescript
interface AwsCliProfile {
  name: string;
  source: 'config' | 'credentials';
  type: 'static' | 'sso' | 'assume_role';
  region?: string;
  roleArn?: string;
  ssoStartUrl?: string;
}
listAwsProfiles: () => requestSidecar<{ profiles: AwsCliProfile[] }>
```

**Backend Implementation** (`auth_routes.py` lines 23-63):
```python
entry: dict = {"name": name, "source": "config"}
if cp.has_option(section, "region"):
    entry["region"] = cp.get(section, "region")  # ✓ Matches
if cp.has_option(section, "sso_start_url"):
    entry["ssoStartUrl"] = cp.get(section, "sso_start_url")  # ✓ camelCase
    entry["type"] = "sso"
elif cp.has_option(section, "role_arn"):
    entry["roleArn"] = cp.get(section, "role_arn")  # ✓ camelCase
    entry["type"] = "assume_role"
else:
    entry["type"] = "static"
profiles.append(entry)
```

**Assessment**: ✓ **Correct** - Proper camelCase conversion.

---

### 7. **Diagnostics Endpoints - Status Code Mismatch with requestDiagnostic**

**Issue**: Frontend uses special `requestDiagnostic` handler but only for certain endpoints.

**Frontend** (`sidecarApi.ts` lines 234-240):
```typescript
const requestDiagnostic = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${sidecarBaseUrl}${path}`, {...});
  const payload = await response.json().catch(() => ({}));
  return payload as T;  // Returns 200 OR 502, both successful
};

runKmsDiagnostic: () => requestDiagnostic<KmsRoundTripResult>('/api/diagnostics/kms')
runCostForecast: () => requestDiagnostic<CostForecastResult>('/api/diagnostics/cost-forecast')
```

**Backend** (`diagnostics_routes.py` lines 10-20):
```python
@router.get('/diagnostics/kms')
async def run_kms_diagnostic():
    result = await diagnostics_service.run_kms_round_trip()
    status_code = 200 if result.get('ok') else 502  # ✓ Correct
    return JSONResponse(status_code=status_code, content=result)

@router.get('/diagnostics/cost-forecast')
async def run_cost_forecast():
    result = await diagnostics_service.run_cost_forecast()
    status_code = 200 if result.get('ok') else 500  # ⚠️ Uses 500, not 502
    return JSONResponse(status_code=status_code, content=result)
```

**Problem**: 
- Cost forecast uses 500 while KMS uses 502 for failures
- `requestDiagnostic` doesn't throw on any status code, so both work
- **BUT** inconsistent error signaling: 500 vs 502

**Expected Fix**: Both should use same status code (recommend 502 for consistency with KMS).

---

### 8. **Health Check - Missing Token Requirement Check**

**Issue**: Frontend doesn't explicitly check if health endpoint requires token.

**Frontend** (`sidecarApi.ts` line 243):
```typescript
health: () => requestSidecar<{ ok: boolean; endpointUrl: string; region: string }>('/health')
```

**Backend** (`server.py` lines 71, 95-100):
```python
@app.middleware("http")
async def token_middleware(request: Request, call_next):
    if request.url.path == "/health" or ...:  # Health is EXEMPT from token check
        return await call_next(request)

@app.get("/health")
async def health_check():
    return {"ok": True, "endpointUrl": ..., "region": ...}
```

**Assessment**: ✓ **Correct** - Health check exempt from auth, as expected.

---

### 9. **Generic Error Handling - Consistency Issue**

**Issue**: Different endpoints use different error status codes.

**Lambda Endpoints** (`lambda_routes.py` lines 22, 29, 36, 43, 50, 57):
- All use `status_code=400` for exceptions

**AWS Resource Endpoints** (`aws_resource_routes.py` lines 19-22):
- Uses `status_code=500` as default, special handling for 404

**Marketplace Endpoints** (`marketplace_routes.py` lines 15, 23, 31, 43, 51):
- All use `status_code=500` for exceptions

**Athena Endpoints** (`athena_routes.py` lines 15, 30, 38, 46, 54, 62):
- All use `status_code=500` for exceptions

**Pattern**: 
- Lambda uses 400 (Client Error)
- Everything else uses 500 (Server Error)

**Problem**: Inconsistent error semantics. Lambda operation failures aren't inherently client errors; they could be API errors.

---

## Summary of Required Fixes

| Issue | Severity | Impact | File | Fix |
|-------|----------|--------|------|-----|
| Lambda endpoints missing response wrapper | High | Frontend expects raw AWS response, breaks consistency | lambda_routes.py | Wrap all responses in `{ok: true}` |
| Athena spread - fragile unpacking | Medium | Assumes `queryExecutionId` field, works but fragile | athena_routes.py | Construct response explicitly instead of spreading |
| Cost forecast uses 500 not 502 | Low | Inconsistent with KMS diagnostic status codes | diagnostics_routes.py | Use 502 for consistency |
| Error status codes inconsistent | Low | Lambda uses 400, others use 500 | lambda_routes.py, marketplace_routes.py, athena_routes.py | Standardize to 500 |

---

## Verification Checklist

- [x] Verify `athena_service.start_query()` returns `{ queryExecutionId: ..., ... }` ✓ Confirmed (line 95)
- [x] Verify `compatibility_service.create_code_artifact_domain()` returns `AwsServiceOverview` ✓ Confirmed (lines 336-350)
- [x] Verify `compatibility_service.create_code_artifact_repository()` returns correct structure ✓ Confirmed (calls same overview method)
- [x] Verify `compatibility_service.create_generic_resource()` returns correct structure ✓ Confirmed (calls `_get_generic_overview`, similar structure)
- [x] Verify `eks_service.get_overview()` returns `EksOverview` structure ✓ Confirmed (lines 19-24)
- [ ] Verify all Lambda service methods return structures that match AWS SDK responses
- [ ] Check if frontend actually relies on raw Lambda response structure or if wrapping is safe

---

---

## Detailed Findings by Endpoint Category

### Lambda Endpoints - All Affected
The following Lambda endpoints return raw AWS SDK responses without `{ok: boolean}` wrapper:

| Endpoint | Returns | Status |
|----------|---------|--------|
| `GET /api/lambda/capabilities` | `LambdaCapabilities` | ✓ Works |
| `GET /api/lambda/functions` | `{ Functions?: [...] }` | ✓ Works (raw AWS) |
| `POST /api/lambda/functions` | Raw AWS response | ✓ Works |
| `PUT /api/lambda/functions/{}/code` | Raw AWS response | ✓ Works |
| `PUT /api/lambda/functions/{}/configuration` | Raw AWS response | ✓ Works |
| `POST /api/lambda/functions/{}/invoke` | `{ metadata, payload }` | ✓ Works (service-shaped) |
| `GET /api/lambda/functions/{}/logs` | `{ logGroupName, events, [warning] }` | ✓ Works (service-shaped) |
| `DELETE /api/lambda/functions/{}` | Raw AWS response | ✓ Works |

**Consistency Issue**: Only Lambda is inconsistent. All other services:
- Marketplace: `{ ok: boolean, [data] }`
- Athena: `{ ok: boolean, [data] }`
- EKS: Direct `EksOverview` (no ok wrapper)
- AWS Services: Direct `AwsServiceOverview` (no ok wrapper)

---

## Implementation Priority

**High Priority** (Breaks consistency, may affect future features):
1. Add `{ok: boolean}` wrapper to Lambda endpoints
   - Affects: `lambda_routes.py` lines 10-57
   - Risk: Medium (requires frontend type updates)

**Medium Priority** (Improves code quality, prevents future bugs):
2. Refactor Athena response spreading to explicit construction
   - Affects: `athena_routes.py` line 28
   - Risk: Low (backward compatible)

**Low Priority** (Minor inconsistency):
3. Standardize error status codes (Lambda uses 400, others use 500)
   - Affects: `lambda_routes.py`, `marketplace_routes.py`, `athena_routes.py`
   - Risk: Low if standardized consistently
4. Align diagnostic status codes (cost-forecast uses 500, should use 502)
   - Affects: `diagnostics_routes.py` line 19
   - Risk: Low (requestDiagnostic handles both)

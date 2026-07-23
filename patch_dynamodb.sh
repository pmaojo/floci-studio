sed -i "s/import { useState, useEffect, useMemo, useCallback } from 'react';/import { useState, useEffect, useMemo, useCallback, useRef } from 'react';/g" src/views/DynamoDBView.tsx
sed -i "s/import { \n  ListTablesCommand,/import { \n  ListTablesCommand,\n  ExecuteStatementCommand,/g" src/views/DynamoDBView.tsx
sed -i "s/} from '@aws-sdk\/client-dynamodb';/} from '@aws-sdk\/client-dynamodb';/g" src/views/DynamoDBView.tsx
